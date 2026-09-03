import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './swagger.js'
import devicesRouter from './routes/devices.js'


// console.log('환경변수 테스트:', process.env.TEST_VALUE)

const app = express()
const PORT = process.env.PORT || 3000 //우리가 배포할 Render 에서는 여러 사람의 앱이 돌아가기 때문에 process.env 환경변수에 Render가 정해준 포트번호가 저장된다
//위 process는  Node.js가 자동으로 주는 객체, 지금 돌아가는 이 프로그램



app.get('/api/health', (req, res) => {
    res.json({ ok: true })
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
//app.use(경로, 미들웨어1, 미들웨어2) — 미들웨어를 두 개 이어서 넘기는 형태
//swaggerUi.serve — 화면에 필요한 CSS·JS 파일들을 제공
//swaggerUi.setup(swaggerSpec) — 우리 명세로 화면을 그림

app.use('/api/devices', devicesRouter);

app.listen(PORT, ()=>{
    console.log(`서버 실행중 - http://localhost:${PORT}`)
})

