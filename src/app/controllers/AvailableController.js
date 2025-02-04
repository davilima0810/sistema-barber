import { 
	startOfDay,
	endOfDay,
	format,
	setHours,
	setMinutes, 
	setSeconds, 
	isAfter 
} from 'date-fns' 
import Appointment from '../models/Appointment'
import { Op } from 'sequelize'

class AvailableController{
  async index(req, res){
  	const { date } = req.query

  	if (!date){
  		return req.status(400).json({ error: 'Data inválida'})
  	}

  	const searchDate = Number(date)

  	const appointment = await Appointment.findAll({
  		where: {
  			provider_id: req.params.providerId,
  			canceled_at: null,
  			date: {
  				[Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
  			}
  		}
  	})

  	const schelude = [
  		'08:00',
  		'09:00',
  		'10:00',
  		'11:00',
  		'12:00',
  		'13:00',
  		'14:00',
  		'15:00',
  		'16:00',
  		'17:00',
  		'18:00',
			'19:00',
			'20:00',
			'21:00',
			'22:00',
  	]

  	const avaiable = await schelude.map(time => {
  		const [ hour, minute ] = time.split(':')
			const value = setSeconds(setMinutes(setHours(searchDate, hour), minute),
					0
				)
				
  		return {
  			time, 
				value: format(value, "yyyy-MM-dd'T'HH:mm:ss"),
				available:
					isAfter(value, new Date()) &&
					!appointment.find(a => format(a.date, 'HH:mm') === time)
  		}
  	})

    return res.json(avaiable)
  }
}

export default new AvailableController()