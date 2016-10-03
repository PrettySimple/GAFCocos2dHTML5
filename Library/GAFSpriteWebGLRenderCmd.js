
(function(){
    gaf.Sprite.WebGLRenderCmd = function (renderable) {
        cc.Sprite.WebGLRenderCmd.call(this, renderable);
        this._defualtShader = cc.shaderCache.programForKey(cc.SHADER_POSITION_TEXTURECOLOR);
        this._customShader = gaf._Shaders.Alpha;

        //this._shaderProgram = this._defualtShader;

        this._tintMult = null;
        this._tintOffset = null;
        this._ctxMatrixBody = null;
        this._ctxMatrixAppendix = null;
    };

    var proto = gaf.Sprite.WebGLRenderCmd.prototype = Object.create(cc.Sprite.WebGLRenderCmd.prototype);
    proto.constructor = gaf.Sprite.WebGLRenderCmd;

    proto._identityVec = [1.0, 1.0, 1.0, 1.0];
    proto._zeroVec = [0.0, 0.0, 0.0, 0.0];
    proto._identityMat = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];

    proto._disableCtx = function(){
        this.setShaderProgram(this._defualtShader);
    };

    proto._enableCtx = function(){
        this.setShaderProgram(this._customShader);
    };

    proto._applyCtxState = function(gafObject){
        var tintMult = gafObject._cascadeColorMult;
        this._tintMult = [
            tintMult.r / 255,
            tintMult.g / 255,
            tintMult.b / 255,
            tintMult.a / 255
        ];

        var tintOffset = gafObject._cascadeColorOffset;
        this._tintOffset = [
            tintOffset.r / 255,
            tintOffset.g / 255,
            tintOffset.b / 255,
            tintOffset.a / 255
        ];

        var filterStack = gafObject._filterStack;
        if(filterStack && filterStack.length > 0 && filterStack[0].type === gaf.EFFECT_COLOR_MATRIX)
        {
            var m = filterStack[0].colorMatrix;
            this._ctxMatrixBody = [
                m.rr, m.rg, m.rb, m.ra,
                m.gr, m.gg, m.gb, m.ga,
                m.br, m.bg, m.bb, m.ba,
                m.ar, m.ag, m.ab, m.aa
            ];
            this._ctxMatrixAppendix = [
                m.r / 255,
                m.g / 255,
                m.b / 255,
                m.a / 255
            ];
        }
        else
        {
            this._ctxMatrixBody = null;
            this._ctxMatrixAppendix = null;
        }
    };

    proto._setUniforms = function()
    {
        if(this._shaderProgram === this._customShader)
        {
            this._shaderProgram.use();
            {
                this._shaderProgram.setUniformLocationWith4fv(
                    gaf._Uniforms.ColorTransformMult,
                    this._tintMult,
                    1
                );
                this._shaderProgram.setUniformLocationWith4fv(
                    gaf._Uniforms.ColorTransformOffset,
                    this._tintOffset,
                    1
                );
            }

            if(this._ctxMatrixBody && this._ctxMatrixAppendix)
            {
                this._shaderProgram.setUniformLocationWithMatrix4fv(
                    gaf._Uniforms.ColorMatrixBody,
                    this._ctxMatrixBody,
                    1
                );
                this._shaderProgram.setUniformLocationWith4fv(
                    gaf._Uniforms.ColorMatrixAppendix,
                    this._ctxMatrixAppendix,
                    1
                );
            }
            else
            {
                this._shaderProgram.setUniformLocationWithMatrix4fv(
                    gaf._Uniforms.ColorMatrixBody,
                    this._identityMat,
                    1
                );
                this._shaderProgram.setUniformLocationWith4fv(
                    gaf._Uniforms.ColorMatrixAppendix,
                    this._zeroVec,
                    1
                );
            }
        }
    };

    proto.rendering = function(ctx)
    {
        this._setUniforms();

        // Super call
        cc.Sprite.WebGLRenderCmd.prototype.rendering.call(this, ctx);
    };

    proto._setTextureCoords = function (rect, needConvert)
    {
        if (needConvert === undefined)
            needConvert = true;
        if (needConvert)
            rect = cc.rectPointsToPixels(rect);

        var node = this._node;
        var tex = node._batchNode ? node.textureAtlas.texture : node._texture;
        var uvs = this._vertices;
        if (!tex)
        {
            return;
        }

        var atlasWidth = tex.pixelsWidth;
        var atlasHeight = tex.pixelsHeight;

        var left, right, top, bottom, locQuad = this._quad;

        left = rect.x / atlasWidth;
        right = (rect.x + rect.width) / atlasWidth;
        top = rect.y / atlasHeight;
        bottom = (rect.y + rect.height) / atlasHeight;

        switch (node._rotation)
        {
            case gaf.ROTATED_CCW:
            {
                if (node._flippedX)
                {
                    top += bottom;
                    bottom = top - bottom;
                    top -= bottom;
                }
                if (node._flippedY)
                {
                    cc.swap(left, right);
                    left += right;
                    right = left - right;
                    left -= right;
                }

                if (this._quad) {
                    locQuad.bl.texCoords.u = right;
                    locQuad.bl.texCoords.v = bottom;
                    locQuad.br.texCoords.u = right;
                    locQuad.br.texCoords.v = top;
                    locQuad.tl.texCoords.u = left;
                    locQuad.tl.texCoords.v = bottom;
                    locQuad.tr.texCoords.u = left;
                    locQuad.tr.texCoords.v = top;
                } else {
                    uvs[0].u = left;
                    uvs[0].v = bottom;
                    uvs[1].u = right;
                    uvs[1].v = bottom;
                    uvs[2].u = left;
                    uvs[2].v = top;
                    uvs[3].u = right;
                    uvs[3].v = top;
                }
            }
                break;

            case gaf.ROTATED_CW:
            {
                if (node._flippedX)
                {
                    top += bottom;
                    bottom = top - bottom;
                    top -= bottom;
                }
                if (node._flippedY)
                {
                    cc.swap(left, right);
                    left += right;
                    right = left - right;
                    left -= right;
                }

                if (this._quad) {
                    locQuad.bl.texCoords.u = left;
                    locQuad.bl.texCoords.v = top;
                    locQuad.br.texCoords.u = left;
                    locQuad.br.texCoords.v = bottom;
                    locQuad.tl.texCoords.u = right;
                    locQuad.tl.texCoords.v = top;
                    locQuad.tr.texCoords.u = right;
                    locQuad.tr.texCoords.v = bottom;
                } else {
                    uvs[0].u = right;
                    uvs[0].v = top;
                    uvs[1].u = left;
                    uvs[1].v = top;
                    uvs[2].u = right;
                    uvs[2].v = bottom;
                    uvs[3].u = left;
                    uvs[3].v = bottom;
                }
            }
                break;

            case gaf.ROTATED_NONE:
                default:
            {
                if (node._flippedX)
                {
                    cc.swap(left, right);
                    left += right;
                    right = left - right;
                    left -= right;
                }
                if (node._flippedY)
                {
                    top += bottom;
                    bottom = top - bottom;
                    top -= bottom;
                }

                if (this._quad) {
                    locQuad.bl.texCoords.u = left;
                    locQuad.bl.texCoords.v = bottom;
                    locQuad.br.texCoords.u = right;
                    locQuad.br.texCoords.v = bottom;
                    locQuad.tl.texCoords.u = left;
                    locQuad.tl.texCoords.v = top;
                    locQuad.tr.texCoords.u = right;
                    locQuad.tr.texCoords.v = top;
                } else {
                    uvs[0].u = left;
                    uvs[0].v = top;
                    uvs[1].u = left;
                    uvs[1].v = bottom;
                    uvs[2].u = right;
                    uvs[2].v = top;
                    uvs[3].u = right;
                    uvs[3].v = bottom;
                }
            }
                break;
        }
    };

})();
