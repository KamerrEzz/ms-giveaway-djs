import { RESTGetAPIChannelMessageResult, RESTPostAPIChannelMessageJSONBody, RESTPatchAPIChannelMessageJSONBody } from "discord-api-types/rest/v10"
import axios from "../services/axios";
import { APIActionRowComponent, APIButtonComponent, APIButtonComponentWithCustomId, APIEmbed, APIEmbedField, APIMessageActionRowComponent, APIMessageComponentEmoji, APIPartialEmoji, ButtonStyle } from "discord-api-types/v10";
import { Giveaway } from "@prisma/client";


export default new class Message {

    create(channel_id: string, body: RESTPostAPIChannelMessageJSONBody, giveaway?: Giveaway) {
        if (giveaway?.message) body.message_reference = {
            message_id: giveaway.message,
            fail_if_not_exists: false,
            channel_id: giveaway.channel,
            guild_id: giveaway.guild

        }
        return this.request("post", `/channels/${channel_id}/messages`, body);
    }

    edit(channel_id: string, message_id: string, body: RESTPatchAPIChannelMessageJSONBody) {
        return this.request("patch", `/channels/${channel_id}/messages/${message_id}`, body);
    }

    delete(channel_id: string, message_id: string) {
        return this.request("delete", `/channels/${channel_id}/messages/${message_id}`);
    }

    async request(method: "post" | "patch" | "delete", url: string, body?: RESTPostAPIChannelMessageJSONBody | RESTPatchAPIChannelMessageJSONBody) {
        try {
            const result = await axios[method](url, JSON.stringify(body));

            if ([200, 201, 202].includes(result.status))
                try {
                    return JSON.parse(result.data) as RESTGetAPIChannelMessageResult;
                } catch (error) {
                    return undefined;
                }
            return undefined;
        } catch (error) {
            throw error;
        }
    }

}();


export function actionRow<T extends APIMessageActionRowComponent>(...components: T[]): APIActionRowComponent<T> {
    return {
        type: 1,
        components
    }
};

export function button(custom_id: string, style: number | ButtonStyle, label?: string, emoji?: string | APIMessageComponentEmoji): APIButtonComponentWithCustomId {
    return {
        type: 2,
        label,
        style,
        custom_id,
        emoji: typeof emoji === "string" ? { name: emoji } : emoji
    }
};

export function embed(title?: string, description?: string, color?: `#${string}` | number, others?: Omit<APIEmbed, "title" | "description" | "color">): APIEmbed {
    return {
        title,
        description,
        color: parseColor(color),
        timestamp: new Date().toISOString(),
        ...others
    }
}

function parseColor(color: `#${string}` | number | undefined): number {
    if (typeof color === "number") return color;
    else if (typeof color === "string") return parseInt(color.replace("#", ""), 16);
    return 0xffffff;
};