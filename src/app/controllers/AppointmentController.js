import * as Yup from 'yup'
import { startOfHour , parseISO, isBefore, format , subHours} from 'date-fns' 
import pt from 'date-fns/locale/pt'
import Appointment from '../models/Appointment'
import User from '../models/User'
import File from '../models/File'
import Notification from '../schemas/Notification'

import Queue from '../../lib/Queue'
import CancellationMail from '../jobs/CancellationMail'


class AppointmentControllers{
  async index(req, res){
    const { page = 1 } = req.query;

    const appointment = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null
      },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider', 
          attributes: ['id', 'name'],
          include: {
            model: File,
            as: 'avatar',
            attributes: ['id', 'path','url']
          }
        }
      ]
    })

    return res.json(appointment)
  }

  async store(req, res){
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required()
    })

    if(!(await schema.isValid(req.body))){
      return res.status(400).json({ error: 'Validation fails' })
    }

    const { provider_id, date } = req.body
    // check se provider_id é um provedor de serviço

    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true
      }
    })

    if (!isProvider){
      return res.status(400).json({ error: "Você só pode criar serviços com fornecedores"})
    }


    /**
     * Check se o provedor de serviço é o mesmo usuario que esta agendando
     */

    if( provider_id === req.userId){
      return res.status(400).json({ error: "Não é permitido fazer agendamentos no seu proprio estabelecimento"})
    }

    /**
     * Checkando se a data ja passou
     */
    const hourStart = startOfHour(parseISO(date))

    if ( isBefore(hourStart, new Date())){
      return res.status(400).json({ error: "Data passada não é permitida!"})
    }

    /**
     * verificando disponibilidade de data no mesmo fornecedor
     */

    const check = await Appointment.findOne({
      where:{
        provider_id,
        canceled_at: null,
        date: hourStart
      }
    })

    if(check){
      return res.status(400).json({ error: "O fornecedor já esta ocupado nessa data!"})
    }
    

    //Criando agendamento

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart
    })

    /*
     * Notificar prestador de serviço 
    */

    const formattedData = format(
      hourStart, 
      "'dia' dd 'de' MMMM', às ' H:mm'h'",
      { locale: pt}
    )  
    const user = await User.findByPk(req.userId)

    await Notification.create({
      content: `Novo agendamento de ${user.name} para o ${formattedData}`,
      user: provider_id
    })

    return res.json(appointment)
  }

  async delete(req, res){
    const appointment = await Appointment.findByPk(req.params.id,{
      include: [{
        model: User,
        as: 'provider',
        attributes: ['name', 'email']
      },{
        model: User,
        as: 'user',
        attributes: ['name']
      }]
    })

    if(appointment.user_id !== req.userId){
      return res.status(401)
        .json({error: "Voçê não tem permissão para cancelar esse agendamento"})
    }

    //diminuindo 2 horas do horario do agendamento
    const dateWithSub = subHours(appointment.date, 2)

    if( isBefore(dateWithSub, new Date())){
      return res.status(401).json({error: "Você só pode cancelar o agendamento até 2 horas antes!"})
    }

    appointment.canceled_at = new Date()

    await appointment.save()
    
    await Queue.add(CancellationMail.key,{
      appointment
    })

    return res.json(appointment)
  }
}

export default new AppointmentControllers()