import swaggerJsdoc from 'swagger-jsdoc'

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '복약기 API',
      version: '1.0.0',
      description: 'spec.md §8 기준. 5단계까지는 인증 없이 user_id 하드코딩.',
    },
    servers: [//요청을 어디로 보낼지, 스웨거 화면에서 골라 사용할 수 있다
      { url: 'http://localhost:3000', description: '로컬' },
      { url: 'https://pillbox-server-wdjx.onrender.com', description: 'Render' },
    ],
  },
  apis: ['./routes/*.js'],//주석을 읽어올 파일들, 
})
