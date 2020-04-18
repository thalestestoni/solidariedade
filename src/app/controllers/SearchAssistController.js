import mongoose from 'mongoose';

import User from '../models/User';
import Necessity from '../models/Necessity';
import Assist from '../models/Assist';

class SearchAssistController {
  async index(req, res) {
    const { latitude, longitude } = req.query;

    const { userId } = req;

    const user = await User.findById({
      _id: mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    const needyCategories = await Necessity.find({
      userId: mongoose.Types.ObjectId(userId),
    }).distinct('category');

    if (!needyCategories.length) {
      return res
        .status(400)
        .json({ error: 'Nenhuma categoria cadastrada ainda' });
    }

    const usersAround = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: 10000,
        },
      },
    }).distinct('_id');

    if (!usersAround.length) {
      return res.json({
        info:
          'Poxa, não achamos usuário ao seu redor, ' +
          'mas não desanime. Novas pessoas podem aparecer a qualquer momento' +
          ' e você será avisado(a)!',
      });
    }

    const assists = await Assist.aggregate([
      {
        $match: {
          userId: { $in: usersAround, $ne: mongoose.Types.ObjectId(userId) },
          category: { $in: needyCategories },
        },
      },
      {
        $group: {
          _id: '$userId',
          userId: { $first: '$userId' },
          userName: { $first: '$userName' },
          userPhone: { $first: '$userPhone' },
          category: {
            $addToSet: '$category',
          },
        },
      },
      {
        $project: { _id: 0 },
      },
    ]);

    if (!assists.length) {
      return res.json({
        info:
          'Poxa, não achamos alguém que possa ajudar nessas categorias, ' +
          'mas não desanime. Novas pessoas podem aparecer a qualquer momento' +
          ' e você será avisado(a)!',
      });
    }

    return res.json(assists);
  }
}

export default new SearchAssistController();
