import { z } from "zod";
import { RepurposedPost } from "../../types.js";

// Replace this import
// import { ChatAnthropic } from "@langchain/anthropic";

import { AzureChatOpenAI } from "@langchain/openai";

const ROUTE_POST_PROMPT = `You're an advanced AI assistant, tasked with routing a user's response.
The only route which can be taken is 'rewrite_posts'. If the user is not asking to rewrite a post/posts, then choose the 'unknown_response' route.
Here's the {POST_OR_POSTS} the user is responding to:
<{POST_OR_POSTS}>
{POSTS}
</{POST_OR_POSTS}>
Here's the user's response:
<user-response>
{USER_RESPONSE}
</user-response>
Please examine the {POST_OR_POSTS} and determine which route to take.
`;

const routeResponseSchema = z.object({
    route: z.enum(["rewrite_posts", "unknown_response"]),
});

export async function routeResponse(
    posts: RepurposedPost[],
    userResponse: string,
): Promise<z.infer<typeof routeResponseSchema>> {
    // Replace with Azure OpenAI
    const model = new AzureChatOpenAI({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION || "2023-07-01-preview",
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        azureOpenAIApiInstanceName: new URL(process.env.AZURE_OPENAI_ENDPOINT || "").hostname.split('.')[0],
        temperature: 0,
    }).bindTools(
        [
            {
                name: "route_response",
                description: "Route the user's response to the appropriate route.",
                schema: routeResponseSchema,
            },
        ],
        {
            tool_choice: "route_response",
        },
    );

    const postOrPosts = posts.length === 1 ? "post" : "posts";
    const formattedPosts =
        posts.length === 1
            ? posts[0].content
            : posts
                .map(
                    (post) => `<post index="${post.index}">\n${post.content}\n</post>`,
                )
                .join("\n");

    const formattedPrompt = ROUTE_POST_PROMPT.replace(
        "{POST_OR_POSTS}",
        postOrPosts,
    )
        .replace("{POSTS}", formattedPosts)
        .replace("{USER_RESPONSE}", userResponse);

    const response = await model.invoke(formattedPrompt);

    return response.tool_calls?.[0].args as z.infer<typeof routeResponseSchema>;
}
