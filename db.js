const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
    text: STRING
})

User.hasMany(Note)
Note.belongsTo(User)

const SECRET_KEY = process.env.JWT

User.byToken = async(token)=> {
  try {
    const verifiedUser = jwt.verify(token, SECRET_KEY)
    const user = await User.findByPk(verifiedUser.userId)
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
  
  const user = await User.findOne({
    where: {
      username
    }
  });
  let result = bcrypt.compare(password, user.password)
  if(user && result) {
    const token = jwt.sign({userId: user.id}, SECRET_KEY)
    return token
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

User.beforeCreate(async(user) => {
    let hashed = await bcrypt.hash(user.password, 5)
    user.password = hashed
})

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );
  const notes = [ { text: 'hello world'}, { text: 'reminder to buy groceries'}, { text: 'reminder to do laundry'} ];
  const [note1, note2, note3] = await Promise.all(notes.map( note => Note.create(note)));
  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);
  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};