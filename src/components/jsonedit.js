import {customElement, bindable} from 'aurelia-framework';

import ace from "ajaxorg/ace-builds";
import "ajaxorg/ace-builds/theme-monokai";
import "ajaxorg/ace-builds/mode-json";

@customElement('json-edit')
export class JsonEdit {

    @bindable code

    internalChange = false;

    codeChanged(newValue) {

        /* Update only if it's not us doing the update */
        if ( this.editor && !this.internalChange ) {
            this.editor.setValue(JSON.stringify(JSON.parse(newValue), undefined, 4));
            this.editor.session.selection.clearSelection();
        }

        /* If it was out change, clear it now */
        if ( this.internalChange ) {
            this.internalChange = false;
        }
    }

    attached() {
        var editor = ace.edit("code");
        var self = this;
        this.editor = editor;
        ace.config.set("basePath", "/jspm_packages/github/ajaxorg/ace-builds@1.1.9/");
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/json");
        editor.setValue(JSON.stringify(JSON.parse(this.code), undefined, 4));
        editor.session.selection.clearSelection();
        editor.$blockScrolling = Infinity;
        editor.getSession().on('change', function(e) {
            self.internalChange = true;
            self.code = editor.getValue();
        });

    }

}