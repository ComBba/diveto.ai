// /pages/index.js
import React, { useState } from "react";
// This is the home page of the website.
export default function Home() {
    const [url, setUrl] = useState("");
    const [summary, setSummary] = useState("");
    const [translation, setTranslation] = useState("");

    const handleChange = (e) => {
        setUrl(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const videoId = extractVideoId(url);
        if (videoId) {
            const response = await fetch(`/api/youtube_summary?videoId=${videoId}`);
            const data = await response.json();
            setSummary(data.summary);
            setTranslation(data.translation);
        } else {
            console.error("Error fetching summary:", response.statusText);
        }
    };

    function extractVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be\.com\/watch\?v=)([\w-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    return (
        <div className="container">
            <h1>YouTube Video Summary</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    YouTube Video URL:<br />
                    <input
                        type="text"
                        value={url}
                        onChange={handleChange}
                        style={{ width: "50%", minWidth: "500px" }} // 수정된 부분
                    />
                </label><br />
                <button type="submit">Generate Summary</button>
            </form>
            {summary && translation ? (
                <table>
                    <thead>
                        <tr>
                            <th width='50%'>English</th>
                            <th>Korean</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{summary}</td>
                            <td>{translation}</td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                <div>
                    <p>Please provide a YouTube video URL to generate a summary.
                        <br />
                        요약을 생성하려면 YouTube 비디오 URL을 입력하세요.
                    </p>
                </div>
            )}
            <style jsx>{`
                .container {
                    margin: 50px 50px;
                    text-align: center;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th,
                td {
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                th {
                    font-weight: bold;
                    background-color: #f2f2f2;
                }
                `}
            </style>
        </div>
    );
}