// http://127.0.0.1:3333/echo?message=Hello -> Hello
//node --inspect server.js

var http = require('http');
var url = require('url');

var server = new http.Server(function(req, res) {

console.log(req.headers);

  var urlParsed = url.parse(req.url, true);
  console.log(urlParsed);
	//debugger;
  if (urlParsed.pathname == '/echo' && urlParsed.query.message) {
    res.setHeader('Cache-control', 'no-cache,no-store,must-revalidate');
    res.end( urlParsed.query.message );
  } else {
    res.statusCode = 404; // Not Found
    res.end("Page not found");
  }
});

server.listen(3333, '127.0.0.1');
