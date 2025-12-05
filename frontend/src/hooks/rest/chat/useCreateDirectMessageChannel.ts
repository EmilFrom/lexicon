import { MutationHookOptions, useMutation } from '@apollo/client';

import { CREATE_DIRECT_MESSAGE_CHANNEL } from '../../../api/discourse-apollo-rest/chatChannel';
import { ChannelList } from '../../../generatedAPI/server';

type CreateDirectMessageChannelInput = {
    target_usernames: string[];
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
        const result = await createDMMutation({
            variables: {
                createDMInput: {
                    target_usernames: params.usernames,
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
