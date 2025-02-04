import Sequelize from 'sequelize'
import databaseConfig from '../config/database';
import mongoose from 'mongoose'
//importar os models para conexao com bd
import User from '../app/models/User'
import File from '../app/models/File'
import Appointment from '../app/models/Appointment'

const models = [User, File, Appointment]

class Database {
  constructor(){
    this.init()
    this.mongo()
  }
  init(){
    this.connection = new Sequelize(databaseConfig)

    models.map(model => model.init(this.connection))
          .map(model => model.associate && model.associate(this.connection.models))
  }
  mongo(){
    this.mongoConnection = mongoose.connect(process.env.MONGO_URL,
      { useNewUrlParser: true, useFindAndModify: true , useUnifiedTopology: true }
    )
  }
}

export default new Database();