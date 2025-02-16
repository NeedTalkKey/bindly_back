// 아이디 중복 확인 API (라우터)
import express from 'express';
import User from './user.js';

const router = express.Router();

router.post('/check-username', async (req, res) => {
    const { username } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(200).json({ exists: true, message: '이미 사용 중인 아이디입니다.' });
        }
        return res.status(200).json({ exists: false, message: '사용 가능한 아이디입니다.' });
    } catch (error) {
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

export default router;