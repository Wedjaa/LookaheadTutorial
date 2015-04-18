import {ESClient} from 'modules/es-client';
import {Router} from 'aurelia-router';
import {Redirect} from 'aurelia-router';
import {Parent} from 'aurelia-framework';


export class SearchTester {

    queries = [
        {
            name: 'contains_not_analyzed',
            description: "Contains - Not Analyzed",
            default_token: "Europe",
            notes: "Try and set the token in lowercase. The search will return entries were the token is present" +
            " in lowercare - since the title fields we are looking into has been " +
            "indexed without being analyzed and the <strong>term, prefix, and wildcard</strong> queries will not " +
            "manipulate the query terms. We are using a <strong>should</strong> to get better scoring, since " +
            "a match with a space afterwards is matching the whole search token (IE: 'Europe '). Titles were the token is part" +
            "of a longer word will have lower scoring (IE: 'European').",
            query: '{"size": 100, "query":{"bool":{"must":[{"wildcard":{"title_raw":{"value":"*{{token}}*"}}}],"should":[{"wildcard":{"title_raw":{"value":"*{{token}} *"}}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'standard',
            notes: "Here we are matching against the title field, this time analyzed with the standard analyzer. The " +
            "query looks similar, but this time the token we use for the search is in lowercase - try switching the case " +
            "ans see what happens. This is - again - due to the use of the <strong>tern and wildcard</strong> queries. " +
            "The <strong>should</strong> query is now using the complete token, since the title was tokenized in" +
            "a list of <em>terms</em>.",
            description: 'Contains - Standard Analyzer',
            default_token: 'europe',
            query: '{"query":{"bool":{"must":[{"wildcard":{"title_default":{"value":"*{{token}}*"}}}],"should":[{"term":{"title_default":{"value":"{{token}}"}}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'standard_starts',
            notes: "A more useful query is one that will return a list of titles that contain the word that starts with the token, for " +
            "the rest this query is identical to the <em>Contains - Standard Analyzer</em> one, with the same issues when it comes to " +
            "case sensitive search terms.",
            description: 'Starts - Standard Analyzer',
            default_token: 'europe',
            query: '{"query":{"bool":{"must":[{"prefix":{"title_default":{"value":"{{token}}"}}}],"should":[{"term":{"title_default":{"value":"{{token}}"}}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'standard_starts_ci',
            notes: "We can create a query that will behave as expected whatever is the case of the search terms; this is done by using " +
            "a <em>query_string</em> based query. Be careful, since this case insensitivity is obtained by the query being analyzed " +
            "in the search  phase - if you try to run the same query on the <em>not_analyzed</em> field you would not be able to search " +
            "for terms that have upper cases in them. Notice that we are using wildcards again to get the results we expect.",
            description: 'Starts - Standard Analyzer - Case Insensitive',
            default_token: 'EurOpE',
            query: '{"query":{"bool":{"must":[{"query_string":{"default_field":"title_default","query":"{{token}}*"}}],"should":[{"query_string":{"default_field":"title_default","query":"{{token}}"}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'ngram_query',
            description: 'Contains Query - NGram based',
            default_token: 'euro',
            notes: 'Now we try and change the things a bit: we first look at the NGram analyzed terms, then we score ' +
            'higher the ones that start with the token or that match the token completely. Try and write "europe" as token ' +
            'and you\'ll see that you will get no results. Why? Because we limited the NGram tokenizer at 5 characters of length ' +
            'maximum. A way around it is to have all the query written in  a <em>should</em> boolean query, and then just score ' +
            'accordingly. Depending on the use cases you may wan to extend your ngram length to a longer value and use it as a filter ' +
            'to speed up searches at the expense of system memory and disk space.',
            query: '{"query":{"bool":{"must":[{"term":{"title_ngram":{"value":"{{token}}"}}}],"should":[{"term":{"title_default":{"value":"{{token}}", "boost": 2.0}}},{"query_string":{"default_field":"title_default","query":"{{token}}*"}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'ngram_query_should',
            description: 'Contains Query - NGram based - Should',
            default_token: 'europe',
            notes: 'A similar contains query, this time the NGram search is wrapped in the should portion of the' +
            ' query, so that we get results even when the ngram are not matching.',
            query: '{"query":{"bool":{"should":[{"term":{"title_ngram":{"value":"{{token}}","boost":1}}},{"term":{"title_default":{"value":"{{token}}","boost":3}}},{"query_string":{"default_field":"title_default","query":"{{token}}*","boost":2}}]}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'edge_query',
            description: 'Begins With Query - Edge NGram based - Filter',
            default_token: 'europe',
            notes: 'We now look for words starting with our token, using the edge ngram analyzed field. In our mapping we gave a maximum length of the' +
            ' edge ngram of 32, to be sure that we can use it directly as a filter, without fear of missing out on our searches. The <em>must</em> collection ' +
            'of the query only contains a <strong>match_all</strong> to make sure we get all the hits from the filter, we then score higher ther ones that ' +
            'match the full term.',
            query: '{"query":{"filtered":{"query":{"bool":{"must":[{"match_all":{}}],"should":[{"term":{"title_default":{"value":"{{token}}","boost":2}}}]}},"filter":{"term":{"title_edge":"{{token}}"}}}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'reverse_edge_query',
            description: 'Ends With Query - Edge NGram based - Filter',
            default_token: 'ing',
            notes: 'We are looking for words ending with our token, using the reversed edge ngram analyzed field. Same ' +
            'principle: higher scores to terms matching the full token. The query is almost identical to the ' +
            '<em>Begins With Query - Edge NGram based - Filter</em> one.',
            query: '{"query":{"filtered":{"query":{"bool":{"must":[{"match_all":{}}],"should":[{"term":{"title_default":{"value":"{{token}}","boost":2}}}]}},"filter":{"term":{"title_edge_back":"{{token}}"}}}},"size":100,"fields":["dcterms:title"]}'
        },
        {
            name: 'custom_query',
            description: 'Custom Query',
            default_token: '',
            notes: 'Try to write your own query - using the fields on the left as a starting point. These fields are not ' +
            'stored, but you can get the whole raw field value in "dcterms:title" - which happens to be the field the ' +
            'table below will be expecting to show you the results.',
            query: '{"query":{"match_all":{}},"fields":["dcterms:title"],"size":100}'
        }
    ];

    properties = [
        { name: "title_raw", description: "Not Analyzed"},
        { name: "title_default", description: "Default Analyzer" },
        { name: "title_ngram", description: "NGram Analyzer"},
        { name: "title_edge", description: "Edge NGram Analyzer" },
        { name: "title_edge_back", description: "Reverse Edge NGram Analyzer"}
    ];

    selectedQuery = this.queries[0];

    tokens = [];
    searchToken = "";

    static inject = [ESClient, Parent.of(Router)];

    // Keep the state during navigation
    static metadata(){ return Metadata.singleton(true); };

    constructor(esClient, router) {
        var self = this;
        this.esClient = esClient;
        this.parentRouter = router;
    }

    createQuery(template) {
        var filled = template.replace(/{{token}}/g, this.selectedQuery.default_token);
        return filled;
    }

    search() {
        var self = this;
        console.log("Test Token: " + this.searchToken);
        console.log("Search Query: " + this.createQuery(this.selectedQuery.query));
        console.log("ES Connection: " + this.parentRouter.options.es.server + ":" + this.parentRouter.options.es.port);
        this.esClient.search('lookahead',  'book', this.createQuery(this.selectedQuery.query))
            .then(results => {
                console.log(results);
                this.results = results;
            })
            .catch(error => {
                console.log("Error: " + error);
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