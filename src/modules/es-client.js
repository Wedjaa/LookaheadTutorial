import {
  HttpClient
}
from 'aurelia-http-client';

export class ESClient {

  static inject = [HttpClient];

  constructor(http) {
    this.http = http;
    this.es = false;
  }

  setConnection(server, port) {
    this.es = {
      server: server,
      port: port,
      url: 'http://' + server + ':' + port + '/'
    }
  }

  getUrl() {
    return this.es.url;
  }

  requestResolver(method, uri, content, getResult) {

    var self = this;

    return new Promise(function(resolve, reject) {
      if (self.es) {
        self.http[method](uri,  content)
          .then(httpResponse => {
            resolve(getResult(httpResponse, false));
          })
          .catch(httpResponse => {
            console.log("ES Returned an error - [" + httpResponse.statusCode + "] " + httpResponse.statusText);
            // Bubble up the error
            if ( httpResponse.statusCode == 0 ) {
              reject(new Error("Connection to ES Failed. Check the ESClient configuration."));
            } else {
              console.log("Getting operation result");
              var result = getResult(httpResponse, true);
              console.log("Operation Result: " + JSON.stringify(result));
              resolve(result);
            }
          });
      } else {
        console.log("Throwing a fit");
        reject(new Error("ES Client Error: no ES connection was configured."));
      }
    });

  }

  hasIndex(indexName) {
    return this.requestResolver('head', this.es.url + indexName, undefined, function(response, error) {
        return (response.statusCode === 200);
    });
  }

  deleteIndex(indexName) {
    return this.requestResolver('delete', this.es.url + indexName, undefined, function(response, error) {
        return (response.statusCode === 200);
    });
  }

  insert(indexName, typeName, document, progressReport) {
    return this.requestResolver('post', this.es.url + indexName + '/' + typeName, document, function(response, error) {
      if (progressReport) {
        progressReport(!error);
      }
      return !error;
    });
  }

  createIndex(indexName, shards, replicas) {

    if (typeof shards === "undefined") {
      shards = 1;
    }

    if (typeof replicas === "undefined") {
      replicas = 0;
    }

    var indexConfiguration = {
      'settings': {
        'number_of_shards' : shards,
        'number_of_replicas' : replicas
      }
    };

    return this.requestResolver('put', this.es.url + indexName, indexConfiguration, function(response, error) {
        return !error;
    });

  }

  closeIndex(indexName) {
    return this.requestResolver('post', this.es.url + indexName + "/_close", undefined, function(response, error) {
      return !error;
    });
  }

  openIndex(indexName) {
    return this.requestResolver('post', this.es.url + indexName + "/_open", undefined, function(response, error) {
      return !error;
    });
  }

  updateSettings(indexName, settings) {

    var self = this;

    var configuration = {
      "settings": settings
    };

    return self.closeIndex(indexName)
        .then(indexClosed => {
          return self.requestResolver('put', self.es.url + indexName + '/_settings', configuration, function(response, error) {
            return !error;
          });
        })
        .then(settingsUpdated => {
          return self.openIndex(indexName);
        })
  }

  addMapping(indexName, typeName, mapping) {

    var content = {};
    content[typeName]= mapping;

    return this.requestResolver('put', this.es.url + indexName + '/_mapping/' + typeName , content, function(response, error) {
      return !error;
    });
  }

  analyze(indexName, analyzerName, text){
    return this.requestResolver('post', this.es.url + indexName + '/_analyze?analyzer=' + analyzerName , text, function(response, error) {
      return response.content;
    });
  }

  search(indexName, typeName, query) {
    return this.requestResolver('post', this.es.url + indexName + '/' + typeName + "/_search" , query, function(response, error) {
      return response.content;
    });
  }
}
