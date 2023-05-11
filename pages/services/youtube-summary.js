// /pages/services/youtube-summary.js
import axios from "axios";
import he from "he";
import { find } from "lodash";
import striptags from "striptags";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";

dotenv.config();

// OpenAI API 설정
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 자막 가져오기
async function getSubtitles({ videoID, lang = "en" }) {
    const { data } = await axios.get(`https://youtube.com/watch?v=${videoID}`);

    // 자막 데이터 확인
    if (!data.includes("captionTracks")) {
        throw new Error(`Could not find captions for video: ${videoID}`);
    }

    // 제목 가져오기
    const titleRegex = /<title>(.+)<\/title>/;
    const [, rawTitle] = titleRegex.exec(data);
    const title = he.decode(rawTitle.replace(" - YouTube", ""));

    // 설명 가져오기
    const descriptionRegex = /"description":{"simpleText":"(.+?)"}/;
    const [, rawDescription] = descriptionRegex.exec(data);
    const description = rawDescription
        ? he.decode(rawDescription.replace(/\\n/g, "\n"))
        : "";

    const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
    const [match] = regex.exec(data);
    const { captionTracks } = JSON.parse(`${match}}`);

    // 자막 언어 찾기
    let subtitle =
        find(captionTracks, {
            vssId: `.${lang}`,
        }) ||
        find(captionTracks, {
            vssId: `a.${lang}`,
        }) ||
        find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

    // 자막 언어 확인
    if (!subtitle || (subtitle && !subtitle.baseUrl)) {
        // 자막 언어 영어로 바꿔서 찾기
        console.log(`Could not find ${lang} captions for ${videoID}, - trying ko`);
        lang = "ko";
        subtitle =
            find(captionTracks, {
                vssId: `.${lang}`,
            }) ||
            find(captionTracks, {
                vssId: `a.${lang}`,
            }) ||
            find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

        // 자막 언어 확인
        if (!subtitle || (subtitle && !subtitle.baseUrl)) {
            throw new Error(`Could not find ${lang} captions for ${videoID}`);
        }
    }

    // 자막 데이터 가져오기
    const { data: transcript } = await axios.get(subtitle.baseUrl);
    const lines = transcript
        .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', "")
        .replace("</transcript>", "")
        .split("</text>")
        .filter((line) => line && line.trim())
        .map((line) => {
            const startRegex = /start="([\d.]+)"/;
            const durRegex = /dur="([\d.]+)"/;

            const [, start] = startRegex.exec(line);
            const [, dur] = durRegex.exec(line);

            const htmlText = line
                .replace(/<text.+>/, "")
                .replace(/&amp;/gi, "&")
                .replace(/<\/?[^>]+(>|$)/g, "");

            const decodedText = he.decode(htmlText);
            const text = striptags(decodedText);

            return {
                start,
                dur,
                text,
            };
        });

    return {
        title,
        description,
        captions: lines.map((line) => line.text).join("\n"),
    };
}

// 텍스트를 최대 토큰 수에 맞게 분할
function splitTextIntoChunks(text, maxTokens = 1000) {
    const words = text.split(" ");
    const chunks = [];
    let chunk = "";

    for (const word of words) {
        if (chunk.length + word.length + 1 <= maxTokens) {
            chunk += " " + word;
        } else {
            chunks.push(chunk.trim());
            chunk = word;
        }
    }

    if (chunk) {
        chunks.push(chunk.trim());
    }

    return chunks;
}

// 분할된 텍스트에 대해 요약 생성
async function generateSummaryForChunks(promptChunks) {
    const summaries = [];
    let cntGenerateSummary = 1;

    for (const chunk of promptChunks) {
        console.log('[Summary]', cntGenerateSummary++, '/', promptChunks.length, ' Processing...')
        const summary = await generateSummary(chunk);
        summaries.push(summary);
    }

    return summaries.join("\n");
}

// OpenAI API를 사용하여 요약 생성
async function generateSummary(prompt) {
    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes YouTube videos.",
                },
                {
                    role: "user",
                    content: `Summarize this video to korean: ${prompt}`,
                },
            ],
            max_tokens: 100,
            temperature: 0.5,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error(`Error generating summary with OpenAI API: ${error.message}`);
    }
}

// 비디오 ID를 사용하여 비디오 요약
async function summarizeVideo(videoId) {
    const { title, description, captions } = await getSubtitles({ videoID: videoId });
    console.log("[title]", title, "\n[description]", description);
    const prompt = `${title}\n\n${description}\n\nCaptions:\n${captions}`;

    // 프롬프트를 분할하고 각 청크에 대한 요약 생성
    const promptChunks = splitTextIntoChunks(prompt);
    const summary = await generateSummaryForChunks(promptChunks);
    console.log("[summary]", summary);
    return summary;
}

export { summarizeVideo };

