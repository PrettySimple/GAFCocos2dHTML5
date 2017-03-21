var gaf = gaf || {};

gaf.Asset = cc.Class.extend
({
    _className: "GAFAsset",

    // Private members
    _header: null,
    _timeLines: null,
    _textFields: null,
    _protos: null,
    _objects: null,
    _masks: null,
    _sounds: null,

    _rootTimeLine: null,
    _textureLoadDelegate: null,
    _sceneFps: 60,
    _sceneWidth: 0,
    _sceneHeight: 0,
    _sceneColor: 0,
    _gafData: null,
    _desiredAtlasScale: 1,
    _usedAtlasScale: 0,

    _atlases: null,
    _onLoadTasks: null,
    _atlasScales: null,
    _textureLoaded: false, // For async loading with cc.event manager
    _atlasesToLoad: null, // Atlases that are not yet loaded
    _gafName: null,

    /**
     * @method initWithGAFFile
     * @param {String} filePath - path to .gaf file
     * @param {String|function(String)} textureLoadDelegate - is used to change atlas path, e.g. to load `atlas.tga` instead of `atlas.png`
     * @return {bool}
     */
    initWithGAFFile: function (filePath, textureLoadDelegate) {
        var self = this;
        this._textureLoadDelegate = textureLoadDelegate;
        this._gafName = filePath;
        var gafData = cc.loader.getRes(filePath);
        if(!gafData)
        {
            cc.loader.load(filePath, function(err, data){
                if(!err)
                {
                    self._init(data[0]);
                }
            });
        }
        else {
            return this._init(gafData);
        }
        return false;
    },

    /**
     * @method initWithGAFBundle
     * @param {String} zipFilePath - path to the archive with .gaf and its textures
     * @param {String} entryFile - name of the .gaf file in archive
     * @param {function({path:String})} delegate - is used to change atlas path, e.g. to load `atlas.tga` instead of `atlas.png`
     * @return {bool}
     */
    initWithGAFBundle: function (zipFilePath, entryFile, delegate)
    {
        var self = this;
        this._textureLoadDelegate = delegate;
        this._gafName = zipFilePath + ':' + entryFile;
        var result = cc.loader.getRes(zipFilePath);
        if(!result)
        {
            cc.loader.load(zipFilePath, function(err, data){
                if(!err)
                {
                    self._init(data[0].gafFiles[entryFile], data[0].notGafFiles);
                }
            });
        }
        else {
            return this._init(result.gafFiles[entryFile], result.notGafFiles);
        }
        return false;
    },

    getSpriteFrameByName: function(linkageName, scale)
    {
        scale = scale || this._usedAtlasScale;
        var regions = this._atlasScales[scale];
        for (var regionID in regions)
        {
            if (regions[regionID].linkageName == linkageName)
            {
                return regions[regionID];
            }
        }
        return null;
    },

    /**
     * @method setRootTimelineWithName
     * @param {String} name
     */
    setRootTimelineWithName: function (name)
    {
        for(var i = 0, end = this._timeLines.length; i < end; ++i)
        {
            var object = this._timeLines[i];
            if (object && object.getLinkageName() === name)
            {
                this._setRootTimeline(object);
                return;
            }
        }
    },

    isAssetVersionPlayable: function ()
    {
        return true;
    },

    /**
     * Desired atlas scale.
     * Default is 1.0f
     * @returns {number}
     */
    desiredAtlasScale : function(){
        return this._desiredAtlasScale;
    },

    /**
     * Sets desired atlas scale. Will choose nearest atlas scale from available.
     * Default is 1.0f
     * @param desiredAtlasScale
     */
    setDesiredAtlasScale : function(desiredAtlasScale){
        this._desiredAtlasScale = desiredAtlasScale;
        for(var currentScale in this._atlasScales)if(this._atlasScales.hasOwnProperty(currentScale))
        {
            if( (this._usedAtlasScale === 0) ||
                (Math.abs(this._usedAtlasScale - desiredAtlasScale) > Math.abs(currentScale - desiredAtlasScale) ))
            {
                this._usedAtlasScale = currentScale;
            }

        }
    },

    /**
     * @method createObject
     * @return {gaf.Object}
     */
    createObject: function ()
    {
        return this._instantiateGaf(this._gafData);
    },

    /**
     * @method createObjectAndRun
     * @param {boolean} looped - run looped
     * @return {gaf.Object}
     */
    createObjectAndRun: function (looped)
    {
        cc.assert(arguments.length === 1, "GAFAsset::createObjectAndRun should have one param");
        var object = this._instantiateGaf(this._gafData);
        object.setLooped(looped, true);
        object.start();
        return object;
    },

    /**
     * @method setTextureLoadDelegate
     * @param {function} delegate
     */
    setTextureLoadDelegate: function (delegate)
    {
        debugger;
    },


    /**
     * @method getSceneFps
     * @return {uint}
     */
    getSceneFps: function ()
    {
        return this._sceneFps;
    },

    /**
     * @method getSceneWidth
     * @return {uint}
     */
    getSceneWidth: function ()
    {
        return this._sceneWidth;
    },

    /**
     * @method getSceneHeight
     * @return {uint}
     */
    getSceneHeight: function ()
    {
        return this._sceneHeight;
    },

    /**
     * @method getSceneColor
     * @return {cc.color4b}
     */
    getSceneColor: function ()
    {
        return this._sceneColor;
    },

    /**
     * @method setSceneFps
     * @param {uint} fps
     */
    setSceneFps: function (fps)
    {
        this._sceneFps = fps;
    },

    /**
     * @method setSceneWidth
     * @param {uint} width
     */
    setSceneWidth: function (width)
    {
        this._sceneWidth = width;
    },

    /**
     * @method setSceneHeight
     * @param {uint} height
     */
    setSceneHeight: function (height)
    {
        this._sceneHeight = height;
    },

    /**
     * @method setSceneColor
     * @param {color4b_object} arg0
     */
    setSceneColor: function (color4B)
    {
        this._sceneColor = color4B;
    },

    /**
     * @method getHeader
     * @return {GAFHeader}
     */
    getHeader: function ()
    {
        return this._header;
    },

    getGAFFileName: function()
    {
        return this._gafName;
    },

    /**
     *
     * @param id - sound ID
     * @returns {SoundConfig}
     */
    getSoundConfig: function(id)
    {
        return this._sounds[id];
    },

    // Private

    ctor : function()
    {
        this._header = {};
        this._timeLines = [];
        this._textFields = [];
        this._objects = [];
        this._masks = [];
        this._protos = [];
        this._atlases = {};
        this._onLoadTasks = [];
        this._atlasScales = {};
        this._atlasesToLoad = {};
        this._sounds = {};

        if(arguments.length > 0)
            this.initWithGAFFile.apply(this, arguments);
    },

    _getProtos: function()
    {
        return this._protos;
    },

    _setRootTimeline : function(timeLine)
    {
        this._rootTimeLine = timeLine;
        this._header.pivot = timeLine.getPivot();
        this._header.frameSize = timeLine.getRect();
    },

    _setHeader : function (gafHeader)
    {
        for(var prop in gafHeader)
        {
            if(gafHeader.hasOwnProperty(prop))
            {
                this._header[prop] = gafHeader[prop];
            }
        }
    },

    _getMajorVerison : function()
    {
        return this._header.versionMajor;
    },

    _init : function(gafData, notGafFiles)
    {
        var self = this;
        this._gafData = gafData;
        this._notGafFiles = notGafFiles;
        this._setHeader(gafData.header);
        this._timeLinesToLink = [];
        if(this._getMajorVerison() < 4)
        {
            this._pushTimeLine(new gaf._TimeLineProto(this, this._header.framesCount, this._header.frameSize, this._header.pivot));
        }
        gaf._AssetPreload.Tags(this, gafData.tags, this._rootTimeLine);

        //Link and create
        this._objects.forEach(function(item)
        {
            switch(item.type)
            {
                case gaf.TYPE_TEXTURE:
                    // Create gaf sprite proto if it is not yet created
                    if(!self._protos[item.objectId])
                    {
                        self._protos[item.objectId] = new gaf._SpriteProto(self, self._atlasScales, item.elementAtlasIdRef);
                    }
                    break;
                case gaf.TYPE_TIME_LINE:
                    // All time line protos are already created, just copy reference
                    self._protos[item.objectId] = self._timeLines[item.elementAtlasIdRef];
                    break;
                case gaf.TYPE_TEXT_FIELD:
                    // All text field protos are already created, just copy reference
                    self._protos[item.objectId] = self._textFields[item.elementAtlasIdRef];
                    break;
                default:
                    cc.log("Unknown object type: " + item.type);
                    break;
            }
        });
        this._masks.forEach(function(item)
        {
            if(self._protos[item.objectId])
            {
                return; // this is continue
            }
            var proto = null;
            switch(item.type)
            {
                case gaf.TYPE_TEXTURE:
                    // Create gaf sprite proto if it is not yet created
                    proto = new gaf._SpriteProto(self, self._atlasScales, item.elementAtlasIdRef);
                    break;
                case gaf.TYPE_TIME_LINE:
                    // All time line protos are already created, just copy reference
                    proto = self._timeLines[item.elementAtlasIdRef];
                    break;
                case gaf.TYPE_TEXT_FIELD:
                    // All text field protos are already created, just copy reference
                    proto = self._textFields[item.elementAtlasIdRef];
                    break;
            }
            self._protos[item.objectId] = new gaf._MaskProto(self, proto, item.elementAtlasIdRef);
        });
        this.setDesiredAtlasScale(this._desiredAtlasScale);

        if(Object.keys(this._atlasesToLoad).length === 0)
        {
            this._textureLoaded = true;
            this.dispatchEvent("load");
        }
    },

    _pushTimeLine : function(timeLine)
    {
        this._timeLines[timeLine.getId()] = timeLine;

        if(timeLine.getId() === 0)
        {
            this._setRootTimeline(timeLine);
        }
    },

    _instantiateGaf : function()
    {
        var root = null;
        root = this._rootTimeLine._gafConstruct();
        return root;
    },

    _onAtlasLoaded : function(id, atlas)
    {
        this._atlases[id] = atlas;
        delete this._atlasesToLoad[id];
        if(Object.keys(this._atlasesToLoad).length === 0)
        {
            this._onLoadTasks.forEach(function(fn){fn()});
            this._onLoadTasks.length = 0;
            this._textureLoaded = true;
            this.dispatchEvent("load");
        }
    },

    isLoaded : function()
    {
        return this._textureLoaded;
    },

    _getSearchPaths: function(sourceUrl)
    {
        if (this._notGafFiles) { // It means - use zip file for this asset
            var tmp = this._gafName.split(':');
            var zipName = tmp[0];
            if (typeof tmp[1] == 'undefined') return [sourceUrl]; // Wrong situation
            var filename = tmp[1];
            tmp = filename.split('/');
            tmp[tmp.length-1] = sourceUrl;
            var key = tmp.join('/');
            var zipKey = zipName + ':' + key;
            var data = this._notGafFiles[key];
            var imgElement = new cc.newElement("IMG");
            imgElement.setAttribute("src", data);

            cc.textureCache.cacheImage(zipKey, imgElement);
            return [zipKey];
        }

        var extendedPath = this.getGAFFileName().split('/');
        extendedPath[extendedPath.length-1] = sourceUrl;
        var alternativeUrl = extendedPath.join('/');

        return [/*sourceUrl,*/ alternativeUrl];
    },

    _startSound: function(config)
    {
        var sound = this._sounds[config.id];
        if (sound)
        {
            gaf.soundManager._startSound(sound, config);
        }
    }
});

/**
 * @method initWithGAFFile
 * @param {String} gafFilePath - path to .gaf file
 * @param {function({path:String})} delegate - is used to change atlas path, e.g. to load `atlas.tga` instead of `atlas.png`
 * @return {gaf.Asset}
 */
gaf.Asset.create = function (gafFilePath, delegate)
{
    return new gaf.Asset(gafFilePath, delegate);
};

/**
 * @method createWithBundle
 * @param {String} zipFilePath - path to the archive with .gaf and its textures
 * @param {String} entryFile - name of the .gaf file in archive
 * @param {function({path:String})} delegate - is used to change atlas path, e.g. to load `atlas.tga` instead of `atlas.png`
 * @return {gaf.Asset}
 */
gaf.Asset.createWithBundle = function (zipFilePath, entryFile, delegate)
{
    var asset = new gaf.Asset();
    asset.initWithGAFBundle(zipFilePath, entryFile, delegate);
    return asset;
};

cc.EventHelper.prototype.apply(gaf.Asset.prototype);
