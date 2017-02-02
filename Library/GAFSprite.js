gaf._SpriteWrapper = cc.Sprite.extend
({
    _rotation: gaf.ROTATED_NONE,

    ctor: function (rotation)
    {
        this._rotation = rotation || this._rotation;
        cc.Sprite.prototype.ctor.call(this);
    },

    /**
     * <p>
     *    set the vertex rect.<br/>
     *    It will be called internally by setTextureRect.                           <br/>
     *    Useful if you want to create 2x images from SD images in Retina Display.  <br/>
     *    Do not call it manually. Use setTextureRect instead.  <br/>
     *    (override this method to generate "double scale" sprites)
     * </p>
     * @param {cc.Rect} rect
     */
    setVertexRect: function(rect)
    {
        cc.Sprite.prototype.setVertexRect.call(this, rect);
        if (cc._renderType == cc.game.RENDER_TYPE_WEBGL
            && this._rotation != gaf.ROTATED_NONE)
        {
            //swap;
            this._rect.width += this._rect.height;
            this._rect.height = this._rect.width - this._rect.height;
            this._rect.width -= this._rect.height;
        }
    },

    /**
     * Updates the texture rect of the CCSprite in points.
     * @function
     * @param {cc.Rect} rect a rect of texture
     * @param {Boolean} [rotated] Whether or not the texture is rotated
     * @param {cc.Size} [untrimmedSize] The original pixels size of the texture
     */
    setTextureRect: function (rect, rotated, untrimmedSize, needConvert)
    {
        var rotatedSize = untrimmedSize;
        if (rotatedSize && this._rotation != gaf.ROTATED_NONE)
        {
            if (cc._renderType == cc.game.RENDER_TYPE_WEBGL)
            {
                rotatedSize = new cc.size(rotatedSize.height, rotatedSize.width);
            }
        }
        cc.Sprite.prototype.setTextureRect.call(this, rect, rotated, rotatedSize, needConvert);
    }
});

gaf.Sprite = gaf.Object.extend
({
    _className: "GAFSprite",

    _hasCtx: false,
    _hasFilter: false,

    ctor: function(gafSpriteProto, usedScale)
    {
        this._super(usedScale);
        cc.assert(gafSpriteProto, "Error! Missing mandatory parameter.");
        this._gafproto = gafSpriteProto;

        ///////////////////////////////////////////////////
        // HELLO, we need this so that our setOpacity()
        // calls work like they are intended to, duh!
        this.setCascadeOpacityEnabled(true);
        ///////////////////////////////////////////////////
    },

    changeSprite: function(frame)
    {
        this.removeChild(this._sprite);
        this._setSprite(frame);
    },

    _setSprite: function(frame)
    {
        cc.assert(frame instanceof cc.SpriteFrame, "Error. Wrong object type.");

        this._sprite = new gaf._SpriteWrapper(frame._rotation);
        this._sprite._renderCmd = this._gafCreateRenderCmd(this._sprite);
        this._sprite.initWithSpriteFrame(frame);
        this._sprite.setAnchorPoint(frame._gafAnchor);
        this._sprite.setOpacityModifyRGB(true);
        this._sprite.setScaleX(frame._gafScaleX);
        this._sprite.setScaleY(frame._gafScaleY);

        this.addChild(this._sprite);

        if(cc._renderType === cc.game.RENDER_TYPE_WEBGL)
        {
            this._sprite.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }
        else
        {
            if (frame._rotation)
            {
                this._sprite._offsetPosition.x -= frame._originalSize.width / 2;
                this._sprite._offsetPosition.y -= frame._originalSize.height / 2;
                if (frame._rotation == gaf.ROTATED_CW)
                {
                    this._sprite.setRotation(-90);
                }
                else if (frame._rotation == gaf.ROTATED_CCW)
                {
                    this._sprite.setRotation(90);
                }
            }
        }
    },

    // Private

    _init: function()
    {
        var frame = this._gafproto.getFrame();

        // Create sprite with custom render command from frame
        this._setSprite(frame);
    },

    _applyState: function(state, parent)
    {
        this._applyStateSuper(state, parent);
        if(this._needsCtx)
        {
            // Enable ctx state if wasn't enabled
            if(!this._hasCtx)
            {
                this._enableCtx();
                this._hasCtx = true;
            }
            // Set ctx shader
            this._applyCtxState(state);
        }
        else
        {
            // Disable ctx state if was enabled
            if(this._hasCtx)
            {
                this._disableCtx();
                this._hasCtx = false;
            }
            // Apply color
            if(!cc.colorEqual(this._sprite._realColor, this._cascadeColorMult))
            {
                this._sprite.setColor(this._cascadeColorMult);
            }
            // Apply opacity
            if(this._sprite.getOpacity() != this._cascadeColorMult.a)
            {
                this._sprite.setOpacity(this._cascadeColorMult.a);
            }
        }
    },

    _enableCtx: function()
    {
        this._sprite._renderCmd._enableCtx();
    },

    _disableCtx: function()
    {
        this._sprite._renderCmd._disableCtx();
    },

    _applyCtxState: function(state){
        this._sprite._renderCmd._applyCtxState(this);
    },

    getBoundingBoxForCurrentFrame: function ()
    {
        var result = this._sprite.getBoundingBox();
        return cc._rectApplyAffineTransformIn(result, this.getNodeToParentTransform());
    },

    _gafCreateRenderCmd: function(item){
        if(cc._renderType === cc.game.RENDER_TYPE_CANVAS)
            return new gaf.Sprite.CanvasRenderCmd(item);
        else
            return new gaf.Sprite.WebGLRenderCmd(item);
    }
});
