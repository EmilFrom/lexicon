import { MutationHookOptions, useMutation } from '@apollo/client';

import { CREATE_DIRECT_MESSAGE_CHANNEL } from '../../../api/discourse-apollo-rest/chatChannel';
import { ChannelList } from '../../../generatedAPI/server';

type CreateDirectMessageChannelInput = {
    target_usernames: string[];
    message: string;
    name?: string;
    icon_upload_id?: number;
    upsert?: boolean;
};

type CreateDirectMessageChannelMutation = {
    createDirectMessageChannel: {
        channel: ChannelList;
    };
};

type CreateDirectMessageChannelMutationVariables = {
    createDMInput: CreateDirectMessageChannelInput;
};

type CreateDMChannelParams = {
    usernames: string[];
    name?: string;
    iconUploadId?: number;
};

export function useCreateDirectMessageChannel(
    options?: MutationHookOptions<
        CreateDirectMessageChannelMutation,
        CreateDirectMessageChannelMutationVariables
    >,
) {
    const [createDMMutation, { data, loading, error }] = useMutation<
        CreateDirectMessageChannelMutation,
        CreateDirectMessageChannelMutationVariables
    >(CREATE_DIRECT_MESSAGE_CHANNEL, options);

    const createDirectMessageChannel = async (params: CreateDMChannelParams) => {
        // Generate default welcome message
        const isGroupChat = params.usernames.length > 1;

        let message: string;
        if (isGroupChat) {
            const membersList = params.usernames.map(u => `@${u}`).join(', ');
            message = `Welcome to the group chat with ${membersList}! Say hi and start chatting 👋`;
        } else {
            message = `Hey! Let's chat 👋`;
        }

        const result = await createDMMutation({
            variables: {
                createDMInput: {
                    target_usernames: params.usernames,
                    message,
                    name: params.name,
                    icon_upload_id: params.iconUploadId,
                    upsert: true, // Reuse existing DM if available
                },
            },
        });

        return result.data?.createDirectMessageChannel?.channel;
    };

    return {
        createDirectMessageChannel,
        loading,
        error,
        data,
    };
}
