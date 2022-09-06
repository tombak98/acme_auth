const express = require('express');
const app = express();
app.use(express.json());
const { models: { User, Note }} = require('./db');
const path = require('path');
const jwt = require('jsonwebtoken')

const requireToken = async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      const user = await User.byToken(token);
      req.user = user;
      next();
    } catch(error) {
      next(error);
    }
  };

app.get('/', (req, res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async(req, res, next)=> {
  try {
    res.send({ token: await User.authenticate(req.body)});
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth', requireToken, async(req, res, next)=> {
  try {
    res.send(req.user);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async(req,res,next) => {
    try {
        let userAndNotes = await User.findOne({
            where: {
                id: req.user.id
            },
            include: {
                model: Note
            }
        })
        res.send(userAndNotes.notes)
    } catch (ex) {
        next(ex)
    }
})

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;