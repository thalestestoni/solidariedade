import * as Yup from 'yup';

import bcrypt from 'bcryptjs';

import User from '../models/User';
import Necessity from '../models/Necessity';
import Assist from '../models/Assist';

class UserController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      phone: Yup.string().required(),
      risk_group: Yup.boolean().required(),
      birthday: Yup.string().required(),
      password: Yup.string().required().min(6),
      confirmPassword: Yup.string().required().min(6),
      sons: Yup.number(),
      sons_age_range: Yup.string(),
      sons_in_home: Yup.number(),
      home_mates: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Failed to validate fields' });
    }

    const phoneExists = await User.findOne({ phone: req.body.phone });

    if (phoneExists) {
      return res.status(400).json({ error: 'Phone already exists.' });
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ error: 'The password does not match with confirm password.' });
    }

    const password_hash = await bcrypt.hash(password, 8);

    req.body.password_hash = password_hash;

    const { id, name, phone } = await User.create(req.body);

    return res.json({
      id,
      name,
      phone,
    });
  }

  async show(req, res) {
    const { id } = req.params;

    const user = await User.findById(id, {
      _id: 0,
      password_hash: 0,
      createdAt: 0,
      updatedAt: 0,
      __v: 0,
    });

    if (!user) {
      return res.status(500).json({ error: 'User not found' });
    }

    return res.json(user);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      phone: Yup.string(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Failed to validate fields' });
    }

    const user = await User.findById(req.userId);

    const { phone, oldPassword, password } = req.body;

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone });

      if (phoneExists) {
        return res.status(400).json({ error: 'Phone already exists.' });
      }
    }

    const oldPasswordMatch = await bcrypt.compare(
      oldPassword,
      user.password_hash
    );

    if (oldPassword && !oldPasswordMatch) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    const password_hash = await bcrypt.hash(password, 8);

    req.body.password_hash = password_hash;

    const { id, name } = await User.findByIdAndUpdate(req.userId, req.body);

    return res.json({
      id,
      name,
      phone,
    });
  }

  async destroy(req, res) {
    const { userId } = req;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.id !== userId) {
      return res
        .status(401)
        .json({ error: "You don't have permission to delete this user" });
    }

    await user.remove();

    await Necessity.deleteMany({ user_id: userId });
    await Assist.deleteMany({ user_id: userId });

    return res.send();
  }
}

export default new UserController();
