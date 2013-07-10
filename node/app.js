

var express = require('express')
    , app = module.exports = express();
 
// Using the .html extension instead of
// having to name the views as *.ejs
app.engine('.html', require('ejs').__express);
 
// Set the folder where the pages are kept
app.set('views', __dirname + '/views');
 
// This avoids having to provide the 
// extension to res.render()
app.set('view engine', 'html');
 
var messages = [
  { name: 'Nathan Explosion', message: 'Dethklok rules' },
  { name: 'William Murderface', message: 'Bass is the heart of the band' },
  { name: 'Dr. Rockso', message: 'Where is my friend Toki?' }
];

 
// Serve the index page
app.get('/', function(req, res){
  res.render('index', {
    pageTitle: 'EJS Demo',
    messages: messages
  });
});

app.use(express.static("../E4A") );
 
if (!module.parent) {
  app.listen(8888);
  console.log('EJS Demo server started on port 8080');
}






