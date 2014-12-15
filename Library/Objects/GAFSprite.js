
gaf.Sprite = gaf.Object.extend({
    _className: "GAFSprite",

    ctor : function(gafSpriteProto){
        cc.assert(gafSpriteProto,  "Error! Missing mandatory parameter.");
        this._proto = gafSpriteProto;

        var frame = this._proto.getObjects()[this._proto.getIdRef()];
        var sprite = cc.Sprite.createWithSpriteFrame(frame);
        this.addChild(sprite);
    },



    // Private

    _applyState : function(state, parent){
        _super._applyState(state, parent);
        this.setExternalTransform(state.matrix);
    }


});
/*
if (cc._renderType === cc._RENDER_TYPE_CANVAS) {
}
else{
    gaf._tmp.WebGLGAFSprite();
    delete  gaf._tmp.WebGLGAFSprite;
}


*/