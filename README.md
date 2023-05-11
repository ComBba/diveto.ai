This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

# YouTube Video Summary

이 프로젝트는 YouTube 비디오의 주요 내용을 요약해주는 웹 애플리케이션입니다. 사용자는 YouTube 비디오 URL을 입력하면, 해당 비디오의 자막을 바탕으로 요약된 내용을 얻을 수 있습니다. 요약 작업은 OpenAI의 GPT-3.5-turbo 모델을 사용하여 수행됩니다.

## 사용 방법

1. 이 저장소를 클론하거나 다운로드합니다.
2. 프로젝트 폴더로 이동한 다음, `yarn` 또는 `npm install` 명령을 실행하여 필요한 종속성을 설치합니다.
3. OpenAI API 키를 사용하여 `.env` 파일을 생성하고, 다음과 같이 API 키를 설정합니다.
### OPENAI_API_KEY=your_openai_api_key

4. `yarn dev` 또는 `npm run dev` 명령을 실행하여 개발 서버를 시작합니다.
5. 웹 브라우저에서 `http://localhost:3000`으로 이동하여 애플리케이션을 사용합니다.

## 주요 기능

- YouTube 비디오 URL 입력
- 비디오 자막을 기반으로 한 요약 생성
- OpenAI GPT-3.5-turbo 모델을 사용한 요약 생성
- 영어 및 한국어 요약 표시

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
