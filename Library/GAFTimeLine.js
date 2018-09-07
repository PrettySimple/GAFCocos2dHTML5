
gaf.TimeLine = gaf.Object.extend
({
    _className: "GAFTimeLine",
    _objects: null,
    _animationStartedNextLoopDelegate: null,
    _animationFinishedPlayDelegate: null,
    _framePlayedDelegate: null,
    _sequenceDelegate: null,
    _fps: 60,
    _frameTime: 1/60,
    _currentSequenceStart: gaf.FIRST_FRAME_INDEX,
    _currentSequenceEnd: gaf.FIRST_FRAME_INDEX,
    _totalFrameCount: 0,
    _isRunning: false,
    _isLooped: false,
    _isReversed: false,
    _timeDelta: 0,
    _animationsSelectorScheduled: false,
    _currentFrame: gaf.FIRST_FRAME_INDEX,
    _currentSequence: null,
    _listeners: null,

    setAnimationStartedNextLoopDelegate: function (delegate)
    {
        this._animationStartedNextLoopDelegate = delegate;
    },
    setAnimationFinishedPlayDelegate: function (delegate)
    {
        this._animationFinishedPlayDelegate = delegate;
    },
    setLooped: function (looped, recursively)
    {
        this._isLooped = looped;
        if (recursively)
        {
            this._objects.forEach(function (item)
            {
                item.setLooped(looped, recursively);
            });
        }
    },
    getBoundingBoxForCurrentFrame: function ()
    {
        var result = null; //cc.rect();
        var isFirstObj = true;
        this._objects.forEach(function (item) {
            if(item.isVisible())
            {
                var bb = item.getBoundingBoxForCurrentFrame();
                if(!bb)
                {
                    bb = item.getBoundingBox();
                }
                if (isFirstObj)
                {
                    isFirstObj = false;
                    result = bb;
                }
                else
                {
                    result = cc.rectUnion(result, bb);
                }
            }
        });

        if(result == null)
        {
            //If we reach this point it means that the current frame of this animation
            //is empty and thus has no bounding box that can be exploited.
            //We could simply return an empty cc.Rect instance, but that would render the object clickable 
            //on root (0, 0), and simply ignoring 0 width and 0 height, would mean that a blinking animation
            //for example would be unclickable when not visible which would in turn become very frustrating.
            //
            //To solve this problem we default to the first frame and try to recover the bounding box from
            //that frame. As a rule of thumb, CC animation must always contain a visible first frame so this
            //can become the most reliable fallback possible.
            var frame = this._showingFrame;
            this.setFrame(1);
            result = this.getBoundingBoxForCurrentFrame();
            this.setFrame(frame);
        }

        return cc._rectApplyAffineTransformIn(result, this.getNodeToParentTransform());
    },
    setFps: function (fps)
    {
        cc.assert(fps !== 0, 'Error! Fps is set to zero.');
        this._fps = fps;
        this._frameTime = 1/fps;
    },
    getObjectByName: function (name)
    {
        var elements = name.split('.');
        var result = null;
        var retId = -1;
        var timeLine = this;
        var BreakException = {};
        try
        {
            elements.forEach(function(element)
            {
                var parts = timeLine._gafproto.getNamedParts();
                if(parts.hasOwnProperty(element))
                {
                    retId = parts[element];
                }
                else
                {
                    // Sequence is incorrect
                    BreakException.lastElement = element;
                    throw BreakException;
                }
                result = timeLine._objects[retId];
                timeLine = result;
            });
        }
        catch (e)
        {
            if (e!==BreakException)
            {
                throw e;
            }
            cc.log("Sequence incorrect: `" + name + "` At: `" + BreakException.lastElement + "`");
            return null;
        }
        return result;
    },
    clearSequence: function ()
    {
        this._currentSequence = null;
        this._currentSequenceStart = gaf.FIRST_FRAME_INDEX;
        this._currentSequenceEnd = this._gafproto.getTotalFrames();
    },
    getIsAnimationRunning: function ()
    {
        return this._isRunning;
    },
    gotoAndStop: function (value)
    {
        var frame = 0;
        if (typeof value === 'string')
        {
            frame = this.getStartFrame(value);
        }
        else
        {
            frame = value;
        }
        if (this.setFrame(frame))
        {
            this.setAnimationRunning(false, false);
            return true;
        }
        return false;
    },
    gotoAndPlay: function (value)
    {
        var frame = 0;
        if (typeof value === 'string')
        {
            frame = this.getStartFrame(value);
        }
        else
        {
            frame = value;
        }
        if (this.setFrame(frame))
        {
            this.setAnimationRunning(true, false);
            return true;
        }
        return false;
    },
    getStartFrame: function (frameLabel)
    {
        var seq = this._gafproto.getSequences()[frameLabel];
        if (seq)
        {
            return seq.start;
        }
        return gaf.IDNONE;
    },
    getEndFrame: function (frameLabel)
    {
        var seq = this._gafproto.getSequences()[frameLabel];
        if (seq)
        {
            return seq.end;
        }
        return gaf.IDNONE;
    },
    setFramePlayedDelegate: function (delegate)
    {
        this._framePlayedDelegate = delegate;
    },
    getCurrentFrameIndex: function ()
    {
        return this._showingFrame;
    },
    getTotalFrameCount: function ()
    {
        return this._gafproto.getTotalFrames();
    },
    start: function ()
    {
        this._enableTick(true);
        if (!this._isRunning)
        {
            this._currentFrame = gaf.FIRST_FRAME_INDEX;
            this.setAnimationRunning(true, true);
        }
    },
    stop: function ()
    {
        this._enableTick(false);
        if (this._isRunning)
        {
            this._currentFrame = gaf.FIRST_FRAME_INDEX;
            this.setAnimationRunning(false, true);
        }
    },
    isDone: function ()
    {
        if (this._isLooped)
        {
            return false;
        }
        else
        {
            if (!this._isReversed)
            {
                return this._currentFrame > this._totalFrameCount;
            }
            else
            {
                return this._currentFrame < gaf.FIRST_FRAME_INDEX - 1;
            }
        }
    },
    getSequences: function()
    {
        return this._gafproto.getSequences();
    },
    playSequence: function (name, looped)
    {
        var s = this.getStartFrame(name);
        var e = this.getEndFrame(name);
        if (gaf.IDNONE === s || gaf.IDNONE === e)
        {
            return false;
        }
        this._currentSequenceStart = s;
        this._currentSequenceEnd = e;
        if (this._currentFrame < this._currentSequenceStart || this._currentFrame > this._currentSequenceEnd)
        {
            this._currentFrame = this._currentSequenceStart;
        }
        else
        {
            this._currentFrame = this._currentSequenceStart;
        }
        this.setLooped(looped, false);
        this.resumeAnimation();
        this._currentSequence = name;
        return true;
    },
    isReversed: function ()
    {
        return this._isReversed;
    },
    setSequenceDelegate: function (delegate)
    {
        this._sequenceDelegate = delegate;
    },
    setFrame: function (index)
    {
        if (index >= gaf.FIRST_FRAME_INDEX && index < this._totalFrameCount)
        {
            this._showingFrame = index;
            this._currentFrame = index;
            this._processAnimation();
            return true;
        }
        return false;
    },

    pauseAnimation: function ()
    {
        if (this._isRunning)
        {
            this.setAnimationRunning(false, false);
        }
    },
    isLooped: function ()
    {
        return this._isLooped;
    },
    resumeAnimation: function ()
    {
        if (!this._isRunning)
        {
            this.setAnimationRunning(true, false);
        }
    },
    setReversed: function (reversed)
    {
        this._isReversed = reversed;
    },
    hasSequences: function ()
    {
        return this._gafproto.getSequences().length > 0;
    },
    getFps: function ()
    {
        return this._fps;
    },

    hasEventListener: function (type)
    {
        var self = this;
        var result = false;
        this._listeners.forEach(function(listener)
        {
            if (listener._listenerID == type + self.__instanceId)
            {
                result = true;
                return;
            }
        });
        return result;
    },

    /**
     * <p>
     * Adds a event listener for a specified event.<br/>
     * </p>
     * @param {function} handler callback function
     * @return {cc.EventListener} Return the listener. Needed in order to remove the event from the dispatcher.
     */
    addEventListener: function (type, handler)
    {
        var customListener = cc.EventListener.create({
            event: cc.EventListener.CUSTOM,
            eventName: type + this.__instanceId,
            callback: handler
        });

        this._listeners.push(customListener);
        cc.eventManager.addListener(customListener, this);

        return customListener;
    },

    /**
     *
     * @param {cc.EventListener} listener The listener of a specified event or a object of some event parameters.
     */
    removeEventListener: function (listener)
    {
        var customListener;
        var i = this._listeners.length;
        while (i--)
        {
            customListener = this._listeners[i];
            if (customListener._getListenerID() == type
            &&  customListener.callback === handler)
            {
                cc.eventManager.removeListener(customListener);
                delete this._listeners[i];
            }
        }
    },

    /**
     *
     * @param {String} type - event type
     */
    removeListeners: function (type)
    {
        var customListener;
        var i = this._listeners.length;
        while (i--)
        {
            customListener = this._listeners[i];
            if (customListener != undefined
            &&  customListener._getListenerID() == type + this.__instanceId)
            {
                cc.eventManager.removeListener(customListener);
                delete this._listeners[i];
            }
        }
    },

    dispatchEvent: function (eventName, data)
    {
        if (this.hasEventListener(eventName))
        {
            var event = new cc.EventCustom(eventName + this.__instanceId);
            if (data !== undefined)
            {
                if (typeof data !== "string")
                {
                    data = data.toString();
                }
                event.setUserData(data);
            }
            cc.eventManager.dispatchEvent(event);
        }
    },

    // Private

    ctor: function(gafTimeLineProto, scale)
    {
        this._super(scale);
        this._objects = [];
        this._listeners = [];
        cc.assert(gafTimeLineProto,  "Error! Missing mandatory parameter.");
        this._gafproto = gafTimeLineProto;
    },

    setExternalTransform: function(affineTransform)
    {
        if(!cc.affineTransformEqualToTransform(this._additionalTransform, affineTransform))
        {
           this.setAdditionalTransform(affineTransform);
        }
    },

    _init: function()
    {
        this.setContentSize(this._gafproto.getBoundingBox());
        this._currentSequenceEnd = this._gafproto.getTotalFrames();
        this._totalFrameCount = this._currentSequenceEnd;
        this.setFps(this._gafproto.getFps());

        var self = this;
        var asset = this._gafproto.getAsset();
        var namedParts = this._gafproto.getNamedParts();

        // Construct objects for current time line
        this._gafproto.getObjects().forEach(function(key)
        {
            var objectProto = asset._getProtos()[key];
            cc.assert(objectProto, "Error. GAF proto for type: " + key.type + " and reference id: " + key + " not found.");
            var object = objectProto._gafConstruct();
            for (var name in namedParts)
            {
                if (namedParts[name] == key)
                {
                    object._name = name;
                    self[name] = object;
                    break;
                }
            }
            self._objects[key] = object;
        });
    },

    _enableTick: function(val)
    {
        if (!this._animationsSelectorScheduled && val)
        {
            this.schedule(this._processAnimations);
            this._animationsSelectorScheduled = true;
        }
        else if (this._animationsSelectorScheduled && !val)
        {
            this.unschedule(this._processAnimations);
            this._animationsSelectorScheduled = false;
        }
    },

    _processAnimations: function (dt)
    {
        this._timeDelta += dt;
        while (this._timeDelta >= this._frameTime)
        {
            this._timeDelta -= this._frameTime;
            this._step();
        }
    },

    _step: function ()
    {
        this._showingFrame = this._currentFrame;

        if(!this.getIsAnimationRunning())
        {
            this._processAnimation();
            return;
        }

        if(this._sequenceDelegate)
        {
            var seq;
            if(!this._isReversed)
            {
                seq = this._getSequenceByLastFrame(this._currentFrame + 1);
            }
            else
            {
                seq = this._getSequenceByFirstFrame(this._currentFrame + 1);
            }

            if (seq)
            {
                this._sequenceDelegate(this, seq);
            }
        }

        if (this._isCurrentFrameLastInSequence())
        {
            if(this._isLooped)
            {
                if(this._animationStartedNextLoopDelegate)
                    this._animationStartedNextLoopDelegate(this);
            }
            else
            {
                this.setAnimationRunning(false, false);
                if(this._animationFinishedPlayDelegate)
                    this._animationFinishedPlayDelegate(this);
            }
            if (this._currentSequenceEnd > 1)
            {
                this.dispatchEvent(gaf.EVENT_SEQUENCE_END);
            }
        }
        this._processAnimation();
        this._currentFrame = this._nextFrame();
    },

    _isCurrentFrameLastInSequence: function()
    {
        if (this._isReversed)
            return this._currentFrame == this._currentSequenceStart;
        return this._currentFrame == this._currentSequenceEnd - 1;
    },

    _nextFrame: function()
    {
        if (this._isCurrentFrameLastInSequence())
        {
            if (!this._isLooped)
                return this._currentFrame;

            if (this._isReversed)
                return this._currentSequenceEnd - 1;
            else
                return this._currentSequenceStart;
        }

        return this._currentFrame + (this._isReversed ? -1 : 1);
    },

    _processAnimation: function ()
    {
        //var id = this._gafproto.getId();
        this._realizeFrame(this, this._currentFrame);
        if (this._framePlayedDelegate)
        {
            this._framePlayedDelegate(this, this._currentFrame);
        }
    },

    _realizeFrame: function(out, frameIndex)
    {
        var self = this;
        var frames = self._gafproto.getFrames();
        if(frameIndex > frames.length)
        {
            return;
        }
        ///////////////////////////////////////////////////
        // FIX 
        // when we do a goToAnd function, we don't necessarily end up on an existing frame!
        var currentFrame = null;
        for (var i in frames)
            if (i > frameIndex)
                break;
            else
                currentFrame = frames[i];
        ///////////////////////////////////////////////////
        if(!currentFrame)
        {
            return;
        }
        var objects = self._objects;
        objects.forEach(function(object)
        {
            if (object.getOpacity() > 0 && !object._visibleChanged)
            {
                object.setOpacity(0);
            }
        });
        var states = currentFrame.states;
        for(var stateIdx = 0, total = states.length; stateIdx < total; ++stateIdx)
        {
            var state = states[stateIdx];
            var object = objects[state.objectIdRef];
            if(!object)
            {
                return;
            }
            if(state.alpha < 0)
            {
                object._resetState();
            }
            object._updateVisibility(state, self);
            if(!object.isVisible())
            {
                continue;
            }
            object._applyState(state, self);
            var parent = out;
            if(state.hasMask)
            {
                ///////////////////////////////////////////////////
                // FIX for older GAF (< 4.)
                var maskIdRef = state.maskObjectIdRef;
                if (maskIdRef.hasOwnProperty("maskObjectIdRef"))
                    maskIdRef = maskIdRef["maskObjectIdRef"];
                ///////////////////////////////////////////////////
                parent = objects[maskIdRef]._getNode();
                cc.assert(parent, "Error! Mask not found.");
            }

            gaf.TimeLine.rearrangeSubobject(parent, object, state.depth);
            if(object._step)
            {
                object._step();
            }
        }
        this._runActions(currentFrame);
    },

    _runActions: function(currentFrame)
    {
        if (currentFrame.actions)
        {
            var action;
            for (var i = 0, l = currentFrame.actions.length; i < l; i++)
            {
                action = currentFrame.actions[i];
                switch (action.type)
                {
                    case gaf.ACTION_STOP:
                        this.pauseAnimation();
                        break;
                    case gaf.ACTION_PLAY:
                        this.resumeAnimation();
                        break;
                    case gaf.ACTION_GO_TO_AND_STOP:
                        this.gotoAndStop(action.params[0]);
                        break;
                    case gaf.ACTION_GO_TO_AND_PLAY:
                        this.gotoAndPlay(action.params[0]);
                        break;
                    case gaf.ACTION_DISPATCH_EVENT:
                        var type = action.params[0];
                        var data;
                        switch (action.params.length)
                        {
                            case 4:
                                data = action.params[3];
                            case 3: // cancelable param is not used
                            case 2: // bubbles param is not used
                        }
                        this.dispatchEvent(type, data);
                        if (type == gaf.PLAY_SOUND)
                        {
                            var asset = this._gafproto.getAsset();
                            var params = JSON.parse(data);
                            asset._startSound(params);
                        }
                        break;
                }
            }
        }
    },

    setAnimationRunning: function(value, recursively)
    {
        this._isRunning = value;
        if(recursively)
        {
            this._objects.forEach(function (obj)
            {
                if (obj && obj.setAnimationRunning)
                {
                    obj.setAnimationRunning(value, recursively);
                }
            });
        }
    },

    _getSequenceByLastFrame: function(frame)
    {
        var sequences = this._gafproto.getSequences();
        for(var item in sequences)
        {
            if(sequences.hasOwnProperty(item))
            {
                if(sequences[item].end === frame)
                {
                    return item;
                }
            }
        }
        return "";
    },

    _resetState : function()
    {
        this._super();
        this._currentFrame = this._currentSequenceStart;
    },

    _getSequenceByFirstFrame: function(frame)
    {
        var sequences = this._gafproto.getSequences();
        for(var item in sequences)
        {
            if(sequences.hasOwnProperty(item))
            {
                if(sequences[item].start === frame)
                {
                    return item;
                }
            }
        }
        return "";
    }
});

gaf.TimeLine.rearrangeSubobject = function(out, object, depth)
{
    var parent = object.getParent();
    if (parent !== out)
    {
        object.removeFromParent(false);
        out.addChild(object, depth);
    }
    else
    {
        object.setLocalZOrder(depth);
    }
};