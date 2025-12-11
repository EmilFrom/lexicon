import { gql } from '@apollo/client';

export const CREATE_PROJECT = gql`
  mutation CreateProject($createProjectInput: CreateProjectInput!) {
    createProject(createProjectInput: $createProjectInput)
      @rest(
        type: "CreateProjectOutput"
        path: "/lexicon/projects"
        method: "POST"
        bodyKey: "createProjectInput"
      ) {
      category {
        id
        name
        slug
        url
      }
      chat_channel_id
      warning
    }
  }
`;

