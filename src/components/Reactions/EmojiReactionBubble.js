import React from 'react';
import PropTypes from 'prop-types';
import {Pressable} from 'react-native';
import styles from '../../styles/styles';
import Text from '../Text';
import * as StyleUtils from '../../styles/StyleUtils';
import withCurrentUserPersonalDetails, {
    withCurrentUserPersonalDetailsDefaultProps,
    withCurrentUserPersonalDetailsPropTypes,
} from '../withCurrentUserPersonalDetails';
import * as Report from '../../libs/actions/Report';

const propTypes = {
    /**
     * The emoji codes to display in the bubble.
     */
    emojiCodes: PropTypes.arrayOf(PropTypes.string).isRequired,

    /**
     * Called when the user presses on the reaction bubble.
     */
    onPress: PropTypes.func.isRequired,

    /**
     * Called when the user long presses or right clicks
     * on the reaction bubble.
     */
    onReactionListOpen: PropTypes.func,

    /**
     * The number of reactions to display in the bubble.
     */
    count: PropTypes.number,

    /**
     * The account ids of the users who reacted.
     */
    reactionUsers: PropTypes.arrayOf(PropTypes.string),

    /** Whether it is for context menu so we can modify its style */
    isContextMenu: PropTypes.bool,

    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    count: 0,
    onReactionListOpen: () => {},
    reactionUsers: [],
    isContextMenu: false,

    ...withCurrentUserPersonalDetailsDefaultProps,
};

const EmojiReactionBubble = (props) => {
    const hasUserReacted = Report.hasAccountIDReacted(props.currentUserPersonalDetails.accountID, props.reactionUsers);
    return (
        <Pressable
            style={({hovered, pressed}) => [
                styles.emojiReactionBubble,
                StyleUtils.getEmojiReactionBubbleStyle(hovered || pressed, hasUserReacted, props.isContextMenu),
            ]}
            onPress={props.onPress}
            onLongPress={props.onReactionListOpen}

            // Prevent text input blur when emoji reaction is clicked
            onMouseDown={e => e.preventDefault()}
        >
            <Text style={[
                styles.emojiReactionBubbleText,
                styles.userSelectNone,
                StyleUtils.getEmojiReactionBubbleTextStyle(props.isContextMenu),
            ]}
            >
                {props.emojiCodes.join('')}
            </Text>
            {props.count > 0 && (
            <Text style={[
                styles.reactionCounterText,
                styles.userSelectNone,
                StyleUtils.getEmojiReactionCounterTextStyle(hasUserReacted),
            ]}
            >
                {props.count}
            </Text>
            )}
        </Pressable>
    );
};

EmojiReactionBubble.propTypes = propTypes;
EmojiReactionBubble.defaultProps = defaultProps;
EmojiReactionBubble.displayName = 'EmojiReactionBubble';

export default withCurrentUserPersonalDetails(EmojiReactionBubble);
