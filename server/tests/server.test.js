const expect = require('expect');
const request = require('supertest');

//Importing the express server in 'server.js' file:
const {app} = require('./../server');
//Importing the 'Todo' model:
const {Todo} = require('./../models/todo');
//Importing the 'User' model:
const {User} = require('./../models/user');
//Import seed file:
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

//We use object destructuring to grab the ids:
const {ObjectID} = require('mongodb');

//Run some code before each test to be sure that the database is empty:
beforeEach(populateUsers);
beforeEach(populateTodos);

//Group the tests with the 'describe' mocha method:
describe('POST /todos', () => {
  //First test:
  it('should create a new todo', (done) => {
    var text = 'Test todo text'
    //Call of the supertest library:
    request(app)
      .post('/todos')
      //Set the token to avoid '401 unauthorized' error:
      .set('x-auth', users[0].tokens[0].token)
      .send({text})
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        //If the text from body response is equal to the text defined, then:
        Todo.find({text}).then((todos) => {
          //Asuming that the database is empty:
          expect(todos.length).toBe(1);
          expect(todos[0].text).toBe(text);
          done();
        }).catch((e) => done(e));
      });
  });
  //Second test when no data is stored due to invalid body:
  it('should not create todo with invalid body data', (done) => {
    request(app)
      .post('/todos')
      //Set the token to avoid '401 unauthorized' error:
      .set('x-auth', users[0].tokens[0].token)
      //Send an empty object:
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find().then((todos) => {
          expect(todos.length).toBe(2);
          done();
        }).catch((e) => done(e));
      });
  });
});

describe('GET /todos', () => {
  //Third test for the GET method:
  it('should get all todos', (done) => {
    request(app)
      .get('/todos')
      //Set the token to avoid '401 unauthorized' error:
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  //Fourth test for the GET method for single resources:
  it('should return todo doc', (done) => {
    request(app)
    //We use the variable injection and the 'toHexString' method to convert an object id into string:
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todos[0].text);
      })
      .end(done);
  });
  //Fifth test for the GET method for single resources:
  it('should not return todo doc created by other user', (done) => {
    request(app)
    //We use the variable injection and the 'toHexString' method to convert an object id into string:
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
  //Sixth test for the GET method for single resources:
  it('should return 404 if todo not found', (done) => {
    //we create a new _id that is not present in the collection:
    var _id = new ObjectID;
    request(app)
      .get(`/todos/${_id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
  //Sixth test for the GET method for single resources:
  it('should return 404 for non-object ids', (done) => {
    request(app)
      .get('/todos/123')
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  //First test case for the DELETE method for single resources:
  it('should remove a todo', (done) => {
    var hexId = todos[1]._id.toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(hexId);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        //Query database using 'findById' and 'toNotExist':
        Todo.findById(hexId).then((todo) => {
          expect(todo).toBeFalsy();
          done();
        }).catch((e) => done(e));
      });
  });
  it('should fail to remove a todo not created by user', (done) => {
    var hexId = todos[0]._id.toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        //Query database using 'findById' and 'toExist':
        Todo.findById(hexId).then((todo) => {
          expect(todo).toBeTruthy();
          done();
        }).catch((e) => done(e));
      });
  });
  //Third test case for the DELETE method for single resources:
  it('should return 404 if todo not found', (done) => {
    //we create a new _id that is not present in the collection:
    var _id = new ObjectID;
    request(app)
      .delete(`/todos/${_id.toHexString()}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });
  //Third test case for the DELETE method for single resources:
  it('should return 404 if object id is invalid', (done) => {
    request(app)
      .delete('/todos/123')
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /todos/:id', () => {
  it('should update the todo', (done) => {
    var hexId = todos[0]._id.toHexString();
    //We set some dummy text:
    var text = 'This should be the new text';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[0].tokens[0].token)
      .send({
        completed: true,
        text
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(true);
        // expect(res.body.todo.completedAt).toBeA('number');
        // For expect >= v21
        expect(typeof res.body.todo.completedAt).toBe('number');
      })
      .end(done);
  });
  it('should fail to update the todo not created by user', (done) => {
    var hexId = todos[0]._id.toHexString();
    //We set some dummy text:
    var text = 'This should be the new text';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        completed: true,
        text
      })
      .expect(404)
      .end(done);
  });
  it('should clear completedAt when todo is not completed', (done) => {
    var hexId = todos[1]._id.toHexString();
    //We set some dummy text:
    var text = 'This should be the new text!!';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        completed: false,
        text
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(false);
        //We assert to the value of completedAt be 'null':
        expect(res.body.todo.completedAt).toBeFalsy();
      })
      .end(done);
  });
});

//Testing POST /users/me:
describe('GET /users/me', () => {
  //First test case:
  it('should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done)
  });
  //Second test case:
  it('should return 401 if not authenticated', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({});
      })
      .end(done)
  });
});

//Testing POST /users:
describe('POST /users', () => {
    //First test case:
    it('should create a user', (done) => {
      var email = 'example@example.com';
      var password = '123abc!';
      request(app)
        .post('/users')
        .send({email, password})
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-auth']).toBeTruthy();
          expect(res.body._id).toBeTruthy();
          expect(res.body.email).toBe(email);
        })
        .end((err) => {
          if (err) {
            return done(err);
          }
          User.findOne({email}).then((user) => {
            expect(user).toBeTruthy();
            expect(user.password).not.toBe(password);
            done();
          });
        });
    });
    it('should return validation errors if request invalid', (done) => {
      var email = 'email';
      var password = '123';
      request(app)
        .post('/users')
        .send({email, password})
        .expect(400)
        .end(done)
    });
    it('should not create user if email in use', (done) => {
      var email = 'daniel@example.com';
      var password = '123abc';
      request(app)
        .post('/users')
        .send({email, password})
        .expect(400)
        .end(done)
    });
});

//Testing POST /users/login:
describe('POST /users/login', () => {
  it('should login user and return auth token', (done) => {
    request(app)
      .post('/users/login')
      .send({
        //We use the second document created in the seed file that doesn't have a token:
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toBeTruthy();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        //Next we test the token generation:
        User.findById(users[1]._id).then((user) => {
          // expect(user.tokens[1]).toInclude({
          //   access: 'auth',
          //   token: res.headers['x-auth']
          // });
          // For expect v >= 21. We have to add the 'toObject' method to return all the user object, otherwise the test is going to throw an error:
          expect(user.toObject().tokens[1]).toMatchObject({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((e) => done(e));
      });
  });
  it('should reject invalid login', (done) => {
    var password = '123abc';
    request(app)
      .post('/users/login')
      .send({
        //We use the second document created in the seed file that doesn't have a token:
        email: users[1].email,
        password: password
      })
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toBeFalsy();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        //Next we test the token generation:
        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).toBe(1);
          done();
        }).catch((e) => done(e));
      });
  });
});

//Testing POST /users/me/token:
describe('DELETE /users/me/token', () => {
  it('should remove auth token on logout', (done) => {
    request(app)
      .delete('/users/me/token')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[0]._id).then((user) => {
          expect(user.tokens.length).toBe(0);
          done();
        }).catch((e) => done(e));
      });
  });
});
