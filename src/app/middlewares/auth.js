import jtw from 'jsonwebtoken'
import authConfig from '../../config/auth'

import { promisify } from 'util'

export default async(req, res, next) => {
  const authHeader = req.headers.authorization

  if(!authHeader){
    res.status(401).json( { error: "token not provided" })
  }

  const [ , token] = authHeader.split(' ')

  try{
    const decoded = await promisify(jtw.verify)(token, authConfig.secret)

    req.userId = decoded.id
    return next()
  }catch(err){
    return res.status(401).json({error: "token invalid"})
  }
}