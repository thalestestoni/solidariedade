import * as Yup from 'yup';

import User from '../models/User';

class ResetPasswordController {
  async store(req, res) {
    const schema = Yup.object().shape({
      phone: Yup.string().required(),
      token: Yup.string().required(),
      password: Yup.string().required().min(6),
      confirmPassword: Yup.string().required().min(6),
    });

    if (!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Os dados informados estão inválidos!' });
    }

    const { phone, token, password, confirmPassword } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ error: 'Telefone não encontrado' });
    }

    if (token !== user.passwordResetToken) {
      return res.status(400).json({ error: 'Codigo de verificação incorreto' });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ error: 'A senha e a confirmação de senha não estão iguais' });
    }

    const now = new Date();

    if (now > user.passwordResetExpires) {
      return res
        .status(400)
        .json({ error: 'Código de verificação expirou, gere um novo' });
    }

    user.password = password;

    user.save();

    return res.send();
  }
}

export default new ResetPasswordController();