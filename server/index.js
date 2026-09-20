import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger.js'
import devicesRouter from './routes/devices.js'
import deviceRouter from './routes/device.js'
import notificationsRouter from './routes/notifications.js'
import userDevicesRouter from './routes/user_devices.js'
import { requireAuth, requireDevice } from './auth.js'

// console.log('환경변수 테스트:', process.env.TEST_VALUE)

const app = express()
const PORT = process.env.PORT || 3000 //우리가 배포할 Render 에서는 여러 사람의 앱이 돌아가기 때문에 process.env 환경변수에 Render가 정해준 포트번호가 저장된다
//위 process는  Node.js가 자동으로 주는 객체, 지금 돌아가는 이 프로그램




// 브라우저가 다른 출처(포트·도메인이 다른 곳)의 응답을 읽게 허락할 출처 목록 - cors해결
app.use(cors({
  origin: [
    'http://localhost:5173',        // 로컬 개발 (npm run dev)
    'https://phill-box.vercel.app', // 배포본
  ],
}))


app.use(express.json())
// put과post요청은 url주소에 모든 정보를 넣는get요청과 다르게 body(본문)에 실어보내는데, 
//네트워크를 통해서 잘게 쪼개져 넘어온 http속 body chunk들을 모아서 글자로 잇고, json으로 해석하는 역할


app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
//app.use(경로, 미들웨어1, 미들웨어2) — 미들웨어를 두 개 이어서 넘기는 형태
//swaggerUi.serve — 화면에 필요한 CSS·JS 파일들을 제공
//swaggerUi.setup(swaggerSpec) — 우리 명세로 화면을 그림


//----------------앱 라우터--------------------------------//

app.use('/api/devices', requireAuth,devicesRouter);
app.use('/api/notifications', requireAuth,notificationsRouter);
app.use('/api/user-devices', requireAuth,userDevicesRouter);





//----------------기기 라우터--------------------------------//

//  사람 토큰이 아니라 기기 키(X-Device-Key)로 확인
app.use('/api/device', requireDevice, deviceRouter)

app.listen(PORT, ()=>{
    console.log(`서버 실행중 - http://localhost:${PORT}`)
})

