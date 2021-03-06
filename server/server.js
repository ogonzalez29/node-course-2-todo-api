//Import the code to set variables:
require('./config/config.js');

//Import express and body-parser libraries:
const express = require('express');
const bodyParser = require('body-parser');

//Import lodash library to use it in the update CRUD method:
const _ = require('lodash');

//Use of object destructuring ES6 to pull data as variables:
var {mongoose} = require('./db/mongoose');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {ObjectID} = require('mongodb');
//Import of the middleware:
var {authenticate} = require('./middleware/authenticate');

var app = express();

//Setting up the port ready for localhost or Heroku:
const port = process.env.PORT;

//Use of body-parser middleware:
app.use(bodyParser.json());

//Routes definition using the 'post' express method. We use the middleware to associate the 'todo' creation with the user:
app.post('/todos', authenticate, (req, res) => {
  var todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });
  todo.save().then((doc) => {
    res.send(doc);
  }, (e) => {
    res.status(400).send(e);
  });
});

//Route to get a 'Todos' list:
app.get('/todos', authenticate, (req, res) => {
  //We use the same method for our server testing case. We list only the 'todos' created by the user who requested them:
  Todo.find({
    _creator: req.user._id
  }).then((todos) => {
    //We send an object instead of an array:
    res.send({todos});
  }, (e) => {
    res.status(400).send(e);
  });
});

//Route to GET an individual resource. We use the ':' followed by a name:
app.get('/todos/:id', authenticate, (req, res) => {
  //The parameter passed is in 'req.params':
  // res.send(req.params);
  var id = req.params.id;
  //To validate the id before the query we use the ObjectID.isValid method:
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }
  //If the 'id' is valid, then 'findOne' and specify the '_id' and '_creator':
  Todo.findOne({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if (!todo) {
      return res.status(404).send();
    }
    //We send an object with the information writing it inside curly brackets '{}':
    res.send({todo});
  }).catch((e) => {
    res.status(400).send();
  });
});

//Route to DELETE an individual resource:
app.delete('/todos/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    }
    const todo = await Todo.findOneAndRemove({
      _id: id,
      _creator: req.user._id
    });
    if (!todo) {
      return res.status(404).send();
    }
    res.send({todo});
  } catch (e) {
    res.status(400).send();
  }
});

//Route to UPDATE an individual resource:
app.patch('/todos/:id', authenticate, (req, res) => {
  var id = req.params.id;
  //Creation of a variable that pulls only the content to be updated. We use the '.pick' method of the 'lodash' library (ref. https://lodash.com/docs/4.17.10#pick):
  var body = _.pick(req.body, ['text', 'completed']);
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }
  //Check if the completed field is set to 'true'. Then change the 'completedAt' field to the actual timestamp. We use the 'isBoolean' lodash method and verify if it's 'true':
  if (_.isBoolean(body.completed) && body.completed) {
    //If true, we change the 'completedAt' field to the actual timestamp using the 'getTime()' method (ref. https://www.w3schools.com/jsref/jsref_gettime.asp):
    body.completedAt = new Date().getTime();
  }
  else {
    //We reset all values to 'false' and 'null':
    body.completed = false;
    body.completedAt = null;
  }
  //If success, we update the document with the 'findOneAndUpdate' mongoose method. The first argument is the key, and the second is the options:
  Todo.findOneAndUpdate({
    _id: id,
    _creator: req.user._id
  }, {$set: body}, {new: true}).then((todo) => {
    if (!todo) {
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((e) => {
    res.status(400).send()
  });
})

//Route to create new user:
app.post('/users', async (req, res) => {
  try {
    const body = _.pick(req.body, ['email', 'password']);
    const user = new User(body);
    await user.save();
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (e) {
    res.status(400).send(e);
  }
});

//Route to test the middleware. We pass the middleware as the second argument:
app.get('/users/me', authenticate , (req, res) => {
  //We send the user as response:
  res.send(req.user);
});

//Route to login users:
app.post('/users/login', async (req, res) => {
  try {
    const body = _.pick(req.body, ['email', 'password']);
    const user = await User.findByCredentials(body.email, body.password);
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (e) {
    res.status(400).send();
  }
});

//Route to logout users deleting the token. We have to use the middleware:
app.delete('/users/me/token', authenticate, async (req, res) => {
  //No need to create a const. We user the 'try' and 'catch' methods to handle error easily:
  try {
    await req.user.removeToken(req.token);
    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

//Setting up the express server:
app.listen(port, () => {
  console.log(`Started on port ${port}`)
});

//Export the express server for testing:
module.exports = {app};
