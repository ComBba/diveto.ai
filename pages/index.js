// /pages/index.js
import React, { useState } from "react";
// This is the home page of the website.
export default function Home() {
    const [url, setUrl] = useState("");
    const [summary, setSummary] = useState("");

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
        <div>
            <h1>YouTube Video Summary</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    YouTube Video URL:
                    <input
                        type="text"
                        value={url}
                        onChange={handleChange}
                        style={{ width: "50%", minWidth: "500px" }} // 수정된 부분
                    />
                </label>
                <button type="submit">Generate Summary</button>
            </form>
            {summary ? (
                <div>
                    <p
                        dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, "<br>") }}
                    ></p>
                </div>
            ) : (
                <div>
                    <p>Please provide a YouTube video URL to generate a summary.</p>
                </div>
            )}
        </div>
    );
}