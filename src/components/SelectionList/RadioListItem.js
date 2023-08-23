import React from 'react';
import {View} from 'react-native';
import PressableWithFeedback from '../Pressable/PressableWithFeedback';
import styles from '../../styles/styles';
import Text from '../Text';
import Icon from '../Icon';
import * as Expensicons from '../Icon/Expensicons';
import themeColors from '../../styles/themes/default';
import {radioListItemPropTypes} from './selectionListPropTypes';
import Avatar from '../Avatar';

function RadioListItem({item, isFocused = false, isDisabled = false, onSelectRow}) {
    const hasBoldText = item.isSelected || Boolean(item.alternateText);
    return (
        <PressableWithFeedback
            onPress={() => onSelectRow(item)}
            disabled={isDisabled}
            accessibilityLabel={item.text}
            accessibilityRole="button"
            hoverDimmingValue={1}
            hoverStyle={styles.hoveredComponentBG}
            focusStyle={styles.hoveredComponentBG}
        >
            <View style={[styles.flex1, styles.justifyContentBetween, styles.sidebarLinkInner, styles.optionRow, styles.userSelectNone, isFocused && styles.sidebarLinkActive]}>
                {Boolean(item.avatar) && (
                    <Avatar
                        containerStyles={styles.pr3}
                        source={item.avatar.source}
                        name={item.avatar.name}
                        type={item.avatar.type}
                    />
                )}

                <View style={[styles.flex1, styles.alignItemsStart]}>
                    <Text
                        style={[styles.optionDisplayName, isFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText, hasBoldText && styles.sidebarLinkTextBold]}
                        numberOfLines={1}
                    >
                        {item.text}
                    </Text>

                    {Boolean(item.alternateText) && (
                        <Text
                            style={[isFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText, styles.optionAlternateText, styles.textLabelSupporting]}
                            numberOfLines={1}
                        >
                            {item.alternateText}
                        </Text>
                    )}
                </View>

                {item.descriptiveText && (
                    <View style={[styles.flexRow, styles.alignItemsCenter, styles.pl2]}>
                        <Text style={styles.textLabel}>{item.descriptiveText}</Text>
                    </View>
                )}

                {item.isSelected && (
                    <View
                        style={[styles.flexRow, styles.alignItemsCenter, styles.pl2]}
                        accessible={false}
                    >
                        <Icon
                            src={Expensicons.Checkmark}
                            fill={themeColors.success}
                        />
                    </View>
                )}
            </View>
        </PressableWithFeedback>
    );
}

RadioListItem.displayName = 'RadioListItem';
RadioListItem.propTypes = radioListItemPropTypes;

export default RadioListItem;
