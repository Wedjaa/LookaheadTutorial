import {customElement, bindable} from 'aurelia-framework';
import "typeahead";

@customElement('look-ahead')
export class LookAhead {


    @bindable selected;
    @bindable es;
    @bindable tpl;

    lookaheadHound = {};

    fillTemplate(lastUrl) {
        var token = lastUrl.substr(lastUrl.lastIndexOf('#')+1);
        var template = this.tpl;
        var filled = template.replace(/{{token}}/g, token.toLowerCase());
        return filled;
    }

    tplChanged(newValue) {
        // We need to rebuilg the lookahead BloodHound
        console.log("New TPL:" + newValue);
    }

    createBloodhount() {

        var self = this;

        this.lookaheadHound = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 10,
            remote: {
                url: this.es,
                replace: function (url, uriEncodedQuery) {
                    return url + "#" + uriEncodedQuery;
                },
                ajax: {
                    converters: {
                        "text json": function(value) {
                            var esResponse = JSON.parse(value);
                            return esResponse.hits.hits;
                        }
                    },
                    beforeSend: function (jqXhr, settings) {
                        jqXhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                        settings.type = 'POST';
                        settings.hasContent = true;
                        settings.data = self.fillTemplate(self.lookaheadHound.transport.lastUrl);
                    }
                }
            }
        });

        this.lookaheadHound.initialize();

    }

    attached() {
        console.log("Preparing lookahead...");
        var self = this;
        this.createBloodhount();

        $('#lookahead .typeahead').typeahead({
            minLength: 2,
            hint: true,
            highlight: true
        }, {
            name: 'lookahead',
            displayKey: function(bookHit) {
                return bookHit.fields['dcterms:title'];
            },
            templates: {
                suggestion: function (bookHit) {
                    return '<strong>' + bookHit._score + '</strong> - ' + bookHit.fields['dcterms:title'];
                }
            },
            source: self.lookaheadHound.ttAdapter()
        });

    }

}