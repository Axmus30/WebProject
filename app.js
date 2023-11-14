const express = require('express') // loads the express package
const bcrypt = require('bcrypt');
const { engine } = require('express-handlebars'); // loads handlebars for Express
const port = 8080 // defines the port
const session = require('express-session');
const app = express() // creates the Express application
const path = require('path');
// defines handlebars engine
app.engine('handlebars', engine());
// defines the view engine to be handlebars
app.set('view engine', 'handlebars');
// defines the views directory
app.set('views', './views');

// define static directory "public" to access css/ and img/
app.use(express.static('public'))

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));


const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./Portfolio.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the my database.');
});

app.post('/auth', async function(request, response) {

	let username = request.body.username;
	let password = request.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `SELECT * FROM Users WHERE username = ?`;
	if (username && password) {
    
    db.serialize(() => {
      db.get(query, [username], (err, row) => {
        if (err) {
          console.error('Error:', err.message);
          return;
        }
        if (row) {
          if(bcrypt.compareSync(password, row.Password)){
            request.session.loggedin = true;
            request.session.username = username;
            response.redirect('/admin');
          } else{
            response.send('Incorrect Password');
          }
        } else {
          response.send('Incorrect Username');
        }
      });
    });


	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.post('/registeruser', async function(request, response) {

	let username = request.body.username;
  
	let password = request.body.password;
  let email = request.body.email;
  
  let confirmpassword = request.body.confirmpassword;
	if (username && password && email && confirmpassword) {
      if(password == confirmpassword){
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = [username,email,hashedPassword ];
        const sql = 'INSERT INTO Users (Username, Email,Password) VALUES (?, ?, ?)';
        db.run(sql, user, err => {
        if (err) {
            throw err;
        }
        response.redirect("/login");
  });
      } else{
        response.send('Passwords dont match');
		    response.end();
      }

		
	} else {
		response.send('Field Empty!');
		response.end();
	}
});




 






// CONTROLLER (THE BOSS)
// defines route "/"
app.get('/', function(request, response){
  response.render('home.handlebars')
})

app.get('/projects', function(request, response){
  let projSelect = `SELECT * FROM Projects`;
  db.all(projSelect, [], (err, rows) => {
    if (err) {
      throw err;
    }
    response.render('projects.handlebars',{proj:rows})
  })
});
  
app.get('/about', function(request, response){
  let projSelect = `SELECT * FROM Faq`;
  db.all(projSelect, [], (err, rows) => {
    if (err) {
      throw err;
    }
    response.render('about.handlebars',{faq:rows})
  })
})

app.get('/contact', function(request, response){
  response.render('contact.handlebars')
})
app.get('/login', function(request, response){
  response.render('login.handlebars')
})
app.get('/register', function(request, response){
  response.render('register.handlebars')
})
app.get('/admin', function(request, response){
  if (request.session.loggedin) {
		response.render('admin.handlebars')
	} else {
		response.redirect('/login');
	}
})

app.get('/createnews', function(request, response){
  if (request.session.loggedin) {
		response.render('createnews.handlebars');
	} else {
		response.redirect('/login');
	}
})

app.get('/changenews', function(request, response){
  if (request.session.loggedin) {
    let projSelect = `SELECT * FROM News ORDER BY id DESC`;
    db.all(projSelect, [], (err, rows) => {
    if (err) {
      throw err;
    }
    response.render('changenews.handlebars',{news:rows})
    });
	} else {
		response.redirect('/login');
	}
})

app.get('/editnews/:id', function(request, response){
  if (request.session.loggedin) {
    const id = request.params.id;
    let projSelect = "SELECT * FROM News WHERE Id = ?";
    db.all(projSelect, id, (err, rows) => {
    if (err) {
      throw err;
    }
    response.render('editnews.handlebars',{news:rows})
    });
	} else {
		response.redirect('/login');
	}
})
app.post("/editnews/:id", (req, res) => {
  const id = req.params.id;
 
  const news = [req.body.Title, req.body.Text, id];
  const sql = 'UPDATE News SET title = ?, text = ? WHERE Id = ?';
  db.run(sql, news, err => {
    if (err) {
      throw err;
    }
    res.redirect("/changenews");
  });
});

app.post("/createnews", (req, res) => {
  const news = [req.body.Title, req.body.Text];
  const sql = 'INSERT INTO News (title, text) VALUES (?, ?)';
  db.run(sql, news, err => {
    if (err) {
      throw err;
    }
    res.redirect("/changenews");
  });
});

app.post("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM News WHERE Id = ?";
  db.run(sql, id, err => {
    if (err) {
      throw err;
    }
    res.redirect("/changenews");
  });
});

app.get('/news', function(request, response){
  let projSelect = `SELECT * FROM News ORDER BY id DESC`;
  db.all(projSelect, [], (err, rows) => {
    if (err) {
      throw err;
    }
    response.render('news.handlebars',{news:rows})
  })
});
// defines the final default route 404 NOT FOUND
app.use(function(req,res){
  res.status(404).render('404.handlebars');
});

// runs the app and listens to the port
app.listen(port, () => {
    console.log(`Server running and listening on port ${port}...`)
})

