import {
  HttpClient
}
from 'aurelia-http-client';

export class DataLoader {

  static inject = [HttpClient];

  constructor(http) {
    this.http = http;
  }

  load(dataUri) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.http.get(dataUri)
        .then(httpResponse => {
          resolve(JSON.parse(httpResponse.response));
        })
        .catch(httpResponse => {
          console.log("Server Returned an error - [" + httpResponse.statusCode + "] " + httpResponse.statusText);
          // Bubble up the error
          reject(new Error("Request for data failed: [" + httpResponse.statusCode + "] " + httpResponse.statusText));
        });
    });
  }

}
