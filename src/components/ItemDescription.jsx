import React from 'react';
import styled from 'react-emotion';
import { Row, Text, palette } from './styleguide';

const DamageIcon = styled.img`
  width: 40px;
  margin-right: 4px;
`;

export default props => {
  function getColor(primaryStatType) {
    return primaryStatType === 'ATTACK'
      ? props.damageColor ? props.damageColor : palette.background
      : palette.background;
  }

  return (
    <div>
      {props.item.instance &&
        props.item.instance.primaryStat &&
        props.item.instance.primaryStat.value > 0 && (
          <Row
            justify="start"
            css={`
              margin-bottom: 8px;
            `}
          >
            {props.damageIconPath && (
              <DamageIcon src={`https://bungie.net${props.damageIconPath}`} />
            )}
            <Text
              css={`
                color: ${getColor(props.primaryStatType)} !important;
              `}
              bold
              size={4}
            >
              {props.item.instance ? props.item.instance.primaryStat.value : 0}
            </Text>
            <Text
              css={`
                color: ${getColor(props.primaryStatType)} !important;
                margin-left: 8px;
              `}
            >
              {props.item.instance && props.primaryStatType}
            </Text>
          </Row>
        )}
      <Text gray italic>
        {' '}
        {props.item.displayProperties.description}{' '}
      </Text>
    </div>
  );
};
