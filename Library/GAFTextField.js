
gaf.TextField = gaf.Object.extend
({
    // Private variables

    _className: "GAFTextField",
    _textField: null,
    _gafproto: null,
    _config: null,

    // Public methods

    // Constructor

    ctor: function(gafTextFieldProto, usedScale)
    {
        this._super(usedScale);
        cc.assert(gafTextFieldProto, "Error! Missing mandatory parameter.");
        this._gafproto = gafTextFieldProto;
    },

    // Private methods

    _init: function()
    {
        var alignment = cc.TEXT_ALIGNMENT_LEFT;
        this._config = this._gafproto.getConfig();
        switch (this._config.align)
        {
            case gaf.TEXT_ALIGN_LEFT:
                alignment = cc.TEXT_ALIGNMENT_LEFT;
                break;
            case gaf.TEXT_ALIGN_CENTER:
                alignment = cc.TEXT_ALIGNMENT_CENTER;
                break;
            case gaf.TEXT_ALIGN_RIGHT:
                alignment = cc.TEXT_ALIGNMENT_RIGHT;
                break;
        }
        var fontStyle = this._config.font;

        switch (fontStyle) //cocos js misunderstands the Flash font families
        {
            case "_sans": fontStyle = "Arial"; break;
            case "_serif": fontStyle = "Times new Roman"; break;
            case "_typewriter": fontStyle = "Courier New"; break;
        }
        var size = cc.size(this._config.width, this._config.height);
        var anchor =
        {
            x: 0 + (this._config.pivot.x / size.width),
            y: 1 - (this._config.pivot.y / size.height)
        };

        if (this._config.editable)
        {
            this._textField = new ccui.TextField(this._config.text, fontStyle, this._config.size);
            this._textField.setTouchEnabled(true);
            this._textField.setTextColor(this._config.color);
            this._textField.setPlaceHolderColor(this._config.color);
            this._textField.setTextHorizontalAlignment(alignment);
            this._textField.passwordEnabled = this._config.displayAsPassword;
            this._textField._textFieldRenderer._dimensions = cc.size(size.width, size.height);

            if (this._config.maxChars > 0)
            {
                this._textField.maxLengthEnabled = true;
                this._textField.maxLength = this._config.maxChars; //TODO: it works for web only
            }
            if (this._config.bold)
            {
                this._textField._textFieldRenderer._setFontWeight("bold"); //TODO: it works for web only
            }
            if (this._config.italic)
            {
                this._textField._textFieldRenderer._setFontStyle("italic"); //TODO: it works for web only
            }
        }
        else
        {
            this._textField = new cc.TextFieldTTF(this._config.text, size, alignment, fontStyle, this._config.size);
            if (this._config.bold)
            {
                this._textField._setFontWeight("bold"); //TODO: it works for web only
            }
            if (this._config.italic)
            {
                this._textField._setFontStyle("italic"); //TODO: it works for web only
            }
            this._textField.setColorSpaceHolder(this._config.color);
        }

        this._textField.setAnchorPoint(anchor);
        this.addChild(this._textField);
    },

    getText: function()
    {
        var text = this._textField.string;
        if (text.length > 0)
        {
            return text;
        }
        return this._textField.getPlaceHolder();
    },

    setText: function(value)
    {
        if (this._config.editable)
        {
            this._textField.string = value;
        }
        this._textField.setPlaceHolder(value);
    }
});

var _p = gaf.TextField.prototype;
cc.defineGetterSetter(_p, "text", _p.getText, _p.setText);
_p=undefined;
