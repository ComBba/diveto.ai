// /pages/services/youtube-summary.js
import axios from "axios";
import he from "he";
import NodeCache from "node-cache";
import { find } from "lodash";
import striptags from "striptags";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";

dotenv.config();

const summaryCache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // 캐시 TTL을 24시간으로 설정

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
function splitTextIntoChunks(text, maxTokens = 500) {
    const tokens = text.split(/\s+/); // 단어를 토큰으로 취급
    const chunks = [];
    let chunk = [];

    for (const token of tokens) {
        // 현재 청크에 토큰을 추가했을 때 최대 토큰 수를 초과하는지 확인
        if (chunk.reduce((sum, t) => sum + t.length, 0) + token.length + chunk.length - 1 <= maxTokens) {
            // 토큰 추가 (+1은 공백 문자를 위한 것)
            chunk.push(token);
        } else {
            // 현재 청크를 저장하고 새 청크 시작
            chunks.push(chunk.join(' '));
            chunk = [token];
        }
    }

    if (chunk.length > 0) {
        chunks.push(chunk.join(' '));
    }

    return chunks;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate a summary and translation using OpenAI API for chunks
async function generateSummaryAndTranslationForChunks(promptChunks) {
    const summaries = [];
    const translations = [];
    let cntGenerateSummary = 1;

    for (const chunk of promptChunks) {
        console.log('[Summary]', cntGenerateSummary, '/', promptChunks.length, ' Processing...')
        const summary = await generateSummary(chunk);
        console.log('[Summary]', cntGenerateSummary, '/', promptChunks.length, '[summary][EN]', summary);
        const translation = await translateText(summary, "Korean");
        console.log('[Summary]', cntGenerateSummary++, '/', promptChunks.length, '[summary][KO]', translation);
        summaries.push(summary);
        translations.push(translation);
    }

    return { summaries: summaries.join("\n"), translations: translations.join("\n") };
}

// Translate text using OpenAI API
async function translateText(text, targetLanguage) {
    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant that translates text to ${targetLanguage}.`,
                },
                {
                    role: "user",
                    content: `Translate the following English text to ${targetLanguage}: ${text}`,
                },
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error(`Error translating text with OpenAI API: ${error.message}`);
    }
}

// OpenAI API를 사용하여 요약 생성
async function generateSummary(prompt) {
    try {
        if (prompt.length > 100) {
            console.log('[prompt.length]', prompt.length, prompt.length * 10, 'ms wait...');
            await sleep(prompt.length * 10); // 대기
        } else {
            await sleep(2 * 1000); // 2초 대기
        }
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that summarizes YouTube videos.",
                },
                {
                    role: "user",
                    content: `Like a professional instructor, I summarize this video in English with about 300 tokens. In addition, if it does not fit the context or is not a commonly used word, it is supplemented and summarized. Links, social media, and other content not directly related to the video are omitted.: ${prompt}`,
                },
            ],
            max_tokens: 1000,
            temperature: 0.8,
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.log(error);
        throw new Error(`Error generating summary with OpenAI API: ${error.message}`);
    }
}

// Summarize a video using its ID
async function summarizeVideo(videoId) {
    // 캐시에서 결과 가져오기
    const cachedResult = summaryCache.get(videoId);
    if (cachedResult) {
        return cachedResult;
    }
    const { title, description, captions } = await getSubtitles({ videoID: videoId, lang: "en" });

    console.log("[title]", title, "\n[description]", description);
    const prompt = `${title}\n\n${description}\n\nCaptions:\n${captions}`;

    // Split the prompt into chunks and generate summary and translation for each chunk
    const promptChunks = splitTextIntoChunks(prompt);
    const { summaries, translations } = await generateSummaryAndTranslationForChunks(promptChunks);

    summaryCache.set(videoId, { summary: summaries, translation: translations });
    console.log("[summary]", summaries, "\n[translation]", translations);
    return { summary: summaries, translation: translations };
}

export { summarizeVideo };

