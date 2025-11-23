import { gql } from '@apollo/client';

export const TOPICS = gql`
  query Topics(
    $sort: TopicsSortEnum!
    $page: Int
    $topPeriod: TopPeriodEnum
    $tag: String
    $categoryId: Int
    $username: String
    $topicsPath: PathBuilder
  ) {
    topics(
      sort: $sort
      page: $page
      topPeriod: $topPeriod
      tag: $tag
      categoryId: $categoryId
      username: $username
    ) @rest(type: "TopicsOutput", path: "", pathBuilder: $topicsPath) {
      users {
        id
        username
        name
        avatar: avatarTemplate
      }
      topicList @type(name: "TopicList") {
        tags {
          id
          name
        }
        topics @type(name: "Topic") {
          id
          title
          imageUrl {
            # <--- Changed from just "imageUrl"
            url
            width
            height
            aspectRatio
          }
          postsCount
          replyCount
          createdAt
          bumpedAt
          excerpt
          firstPostContent
          visible
          liked
          tags
          views
          likeCount
          categoryId
          posters {
            userId
            description
            user {
              id
              username
              name
              avatar: avatarTemplate
            }
          }

          authorUserId
          pinned
        }
      }
    }
  }
`;
