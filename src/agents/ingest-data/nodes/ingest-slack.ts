import { IngestDataAnnotation } from "../ingest-data-state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { SlackMessageFetcher } from "../../../clients/slack.js";
import { extractUrlsFromSlackText } from "../../utils.js";

const getChannelIdFromConfig = async (
  config: LangGraphRunnableConfig,
): Promise<string | undefined> => {
  if (config.configurable?.slackChannelName) {
    const client = new SlackMessageFetcher({
      channelName: config.configurable.slackChannelName,
    });
    return await client.getChannelId();
  }
  return config.configurable?.slackChannelId;
};

export async function ingestSlackData(
  state: typeof IngestDataAnnotation.State,
  config: LangGraphRunnableConfig,
): Promise<Partial<typeof IngestDataAnnotation.State>> {
  if (config.configurable?.skipIngest) {
    if (state.links.length === 0) {
      throw new Error("Can not skip ingest with no links");
    }
    return {};
  }

  const channelId = await getChannelIdFromConfig(config);
  if (!channelId) {
    throw new Error("Channel ID not found");
  }

  const client = new SlackMessageFetcher({
    channelId: channelId,
  });
  const recentMessages = await client.fetchLast24HoursMessages(
    config.configurable?.maxMessages,
  );
  if (recentMessages.length > 1) {
    throw new Error("More than one message found");
  }
  const links = recentMessages.flatMap((msg) => {
    const links = extractUrlsFromSlackText(msg.text);
    if (!links.length) {
      return [];
    }
    return links;
  });

  return {
    links,
  };
}
