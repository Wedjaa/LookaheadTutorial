import {ESClient} from 'modules/es-client';
import {Router} from 'aurelia-router';
import {Redirect} from 'aurelia-router';
import {Parent} from 'aurelia-framework';


export class AnalyzersTester {

    analyzers = [
        { name: 'standard', description: 'Standard Analyzer'},
        { name: 'ngram_analyzer', description: 'NGram Analyzer'},
        { name: 'edge_analyzer', description: 'Edge NGram Analyzer'},
        { name: 'back_edge_analyzer', description: 'Reverse Edge NGram Analyzer'}
    ];

    selectedAnalyzer = 'standard';
    tokens = [];
    testString = "The quick Joe Backpacker jumped the old lady with the bag in a park";

    static inject = [ESClient, Parent.of(Router)];

    // Keep the state during navigation
    static metadata(){ return Metadata.singleton(true); };

    constructor(esClient, router) {
        this.esClient = esClient;
        this.parentRouter = router;
    }

    highlight(token) {
        var completeToken = this.testString.substring(token.start_offset, token.end_offset);
        var parsedToken = token.token;
        var beforeString = this.testString.substring(0, token.start_offset);
        var afterString = this.testString.substring(token.end_offset, this.testString.length);
        if ( completeToken.length != parsedToken.length ) {
            // This is a reversed token, it misses the beginning
            // of the word - add it to the before string
            var missingPart = completeToken.substr(0, completeToken.length-parsedToken.length);
            beforeString = beforeString + missingPart;
        }
        var highlighted = beforeString +
        "<mark>" + token.token + "</mark>" + afterString;

        return highlighted;
    }

    analyze() {
        var self = this;
        console.log("Test String: " + this.testString);
        console.log("Analyzer: " + this.selectedAnalyzer);
        console.log("ES Connection: " + this.parentRouter.options.es.server + ":" + this.parentRouter.options.es.port);
        this.esClient.analyze('lookahead', this.selectedAnalyzer, this.testString)
            .then(response => {
                console.log("Result: ");
                console.log(response);
                self.tokens = response.tokens;
            })
    }

    canActivate() {
        if ( typeof this.parentRouter.options.es === 'undefined') {
            console.log("Redirecting to load");
            this.parentRouter.options.message = "Check ES Server parameters first.";
            return new Redirect('/load');
        }

        this.esClient.setConnection(this.parentRouter.options.es.server, this.parentRouter.options.es.port);

        return this.esClient.hasIndex('lookahead')
            .then(indexExists => {
                if (indexExists ) {
                    return true;
                }
                this.parentRouter.options.message = "Load sample data first.";
                return new Redirect('/load');
            })
    }

}