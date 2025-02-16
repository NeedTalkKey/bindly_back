import mongoose from 'mongoose';
import User from './user.js';
import Auth from './auth.js';

/*
로컬 회원가입 : 회원가입 완료 시 User와 Auth(이메일 인증) 처리를 하나의 트랜잭션 내에서 진행
필드 설명:
- username: 회원가입 시 입력한 아이디 (User.username)
- hashedPassword: 해시 처리된 비밀번호 (User.password)
- email: 회원가입 시 입력한 이메일 (User.email)
- nickname: 회원가입 시 입력한 닉네임 (User.nickname)
- emailAuthCode: 프론트엔드에서 입력한 인증번호 (Auth.auth_number와 비교)
*/
export async function registerUser({ username, hashedPassword, email, nickname, emailAuthCode }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // 1. 새로운 사용자 생성 (User 스키마: username, password, email, nickname)
        const newUser = new User({
            username,
            password: hashedPassword,
            email,
            nickname
        });
        await newUser.save({ session });

        // 2. 해당 사용자의 이메일 인증 기록(Auth 스키마)을 조회 (필드: user_id, auth_number, expire_time, fail_cnt)
        const authRecord = await Auth.findOne({ user_id: newUser._id }).session(session);
        if (!authRecord) {
            throw new Error("인증 기록이 존재하지 않습니다.");
        }

        // 3. 인증 만료 여부 체크
        if (authRecord.expire_time < new Date()) {
            throw new Error("인증 코드가 만료되었습니다.");
        }

        // 4. 인증번호 비교
        if (authRecord.auth_number !== emailAuthCode) {
            // 인증번호 불일치 : 트랜잭션 내 변경사항은 롤백
            await session.abortTransaction();
            session.endSession();
            
            // 별도의 쿼리로 fail_cnt 증가 처리 (트랜잭션 내부 쿼리가 아님)
            await Auth.updateOne({ _id: authRecord._id }, { $inc: { fail_cnt: 1 } });
            const updatedAuth = await Auth.findById(authRecord._id);
            if (updatedAuth.fail_cnt >= 5) {
                throw new Error("인증 실패 횟수가 최대치에 도달했습니다.");
            }
            throw new Error("인증 코드가 올바르지 않습니다.");
        }

        // 5. 인증 성공 시 인증 기록 삭제
        await Auth.findByIdAndDelete(authRecord._id).session(session);

        // 6. 모든 작업 성공 시 트랜잭션 커밋
        await session.commitTransaction();
        session.endSession();
        return newUser;
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        throw error;
    }
}