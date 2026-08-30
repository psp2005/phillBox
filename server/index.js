import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000 //우리가 배포할 Render 에서는 여러 사람의 앱이 돌아가기 때문에 process.env 환경변수에 Render가 정해준 포트번호가 저장된다
//위 process는  Node.js가 자동으로 주는 객체, 지금 돌아가는 이 프로그램

//서버가 살아있는지 확인하는 주소
app.get('/app/health', (req, res)=>{
    res.json({ok: true})
})

app.listen(PORT, ()=>{
    console.log(`서버 실행중 - http://localhost:${PORT}`)
})

