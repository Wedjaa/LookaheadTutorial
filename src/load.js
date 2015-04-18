import {computedFrom} from 'aurelia-framework';
import {ESClient} from 'modules/es-client';
import {DataLoader} from 'modules/data-loader';
import {Router} from 'aurelia-router';
import {Parent} from 'aurelia-framework';

export class LoadData {

    heading = 'Load Tutorial Data';
    server = '127.0.0.1';
    port = '9200';
    progressText = '';
    counterStyle = {
        display: 'none'
    };

    alertStyle = {
        'display': 'none',
        'margin-top': '20px'
    };

    settings = {
        "analysis" : {
            "analyzer" : {
                "ngram_analyzer" : {
                    "tokenizer" : "ngram_tokenizer",
                    "filter": ["lowercase"]
                },
                "edge_analyzer" : {
                    "tokenizer" : "edge_tokenizer",
                    "filter": ["lowercase"]
                },
                "back_edge_analyzer": {
                    "tokenizer": "standard",
                    "filter": ["lowercase", "reverse", "edge_custom_filter", "reverse"]
                }
            },
            "tokenizer" : {
                "ngram_tokenizer" : {
                    "type" : "nGram",
                    "min_gram" : "3",
                    "max_gram" : "5",
                    "token_chars": [ "letter", "digit" ]
                },
                "edge_tokenizer" : {
                    "type": "edgeNGram",
                    "min_gram": "2",
                    "max_gram": "32",
                    "token_chars": ["letter", "digit"]
                }
            },
            "filter": {
                "edge_custom_filter": {
                    "type": "edgeNGram",
                    "min_gram": "2",
                    "max_gram": "32"
                }
            }
        }
    };

    bookMapping = {
        "properties" : {
            "dcterms:title" : { "type" : "string", "copy_to" : ["title_raw", "title_default", "title_ngram", "title_edge", "title_edge_back"] },
            "title_raw" : {
                "type" : "string",
                "index" : "not_analyzed"
            },
            "title_default" : {
                "type" : "string"
            },
            "title_ngram": {
                "type": "string",
                "analyzer":  "ngram_analyzer"
            },
            "title_edge": {
                "type": "string",
                "analyzer":  "edge_analyzer"
            },
            "title_edge_back": {
                "type": "string",
                "analyzer":  "back_edge_analyzer"
            }
        }
    };

    static inject = [ESClient, DataLoader, Parent.of(Router)];

    // Keep the state during navigation
    static metadata(){ return Metadata.singleton(true); };

    constructor(esClient, dataLoader, router) {
        this.esClient = esClient;
        this.dataLoader = dataLoader;
        this.parentRouter = router;
        if (this.parentRouter.options.message ) {
            this.message = this.parentRouter.options.message;
            this.alertStyle.display = 'block';
        }
    }

    @computedFrom('server', 'port')
    get serverUrl() {
        return `http://${this.server}:${this.port}/lookahead`;
    }

    progressUpdate(total, current) {
        var percent = current / total * 100;
        var self = this;
        setTimeout(function() {
            self.progressText = current + " of " + total;
        }, 0);
    }

    activate(params, queryString, routeConfig) {
        console.log("Activating");
        console.log(routeConfig);
    }

    canDeactivate() {
        // We do this here because we want to have
        // everything in place when the activate
        // function of the next route is executed
        console.log("Saving ES Server");
        this.parentRouter.options.es = {
            server: this.server,
            port: this.port
        };
        // Remove messages
        this.parentRouter.options.message = false;
    }

    loadData()
    {
        var esClient = this.esClient;
        var dataLoader = this.dataLoader;
        var self = this;

        esClient.setConnection(this.server, this.port);
        esClient.hasIndex('lookahead')
            .then(hasIndex => {
                if (hasIndex) {
                    // Remove existing index
                    console.log("Remove and create existing index.");
                    return esClient.deleteIndex('lookahead')
                            .then(success => {
                                return esClient.createIndex('lookahead');
                            });
                }   else    {
                    // Create the index
                    console.log("Creating the index.");
                    return esClient.createIndex('lookahead');
                }
            })
            .then(indexReady => {
                // Create the analyzers
                return esClient.updateSettings('lookahead', self.settings);
            })
            .then(settingsDone => {
                // Prepare our mapping
                return esClient.addMapping('lookahead', 'book', self.bookMapping);
            })
            .then(mappingDone => {
                // The index is ready, load the JSON data to import
                return dataLoader.load('/resources/bl_uk_data.json');
            })
            .then(jsonData => {
                console.log("Loaded Data");
                self.counterStyle = {
                    display: "block"
                }
                var insertPromises = [];
                var totalBooks = jsonData.books.length;
                var executed = 0;
                for (var jsonRecord in jsonData.books) {
                    insertPromises.push(esClient.insert('lookahead', 'book', jsonData.books[jsonRecord], function(success){
                        self.progressUpdate(totalBooks, ++executed);
                    }));
                }
                return Promise.all(insertPromises);
            })
            .then( success  => {
                self.counterStyle = {
                    display: "none"
                };
            })
            .catch(error => {
                console.log("Error: " + error);
            });

        }

}
