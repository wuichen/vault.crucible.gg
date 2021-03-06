import React from 'react';
import Card from 'material-ui/Card';
import vaultIcon from './icon_vault.png';
import styled from 'react-emotion';
import { Text, Row, Column, animations } from './styleguide';

const CardContainer = styled(Card)`
  ${animations.fadeIn};
  overflow: hidden;
  margin: 10px 0 5px;
`;

const StyledCard = styled(Row)`
  user-select: none;
  background-size: cover;
  padding: 0 0 0 10px;
  min-width: ${props => (!props.vault ? '240px' : 'none')};
  max-width: ${props => (!props.vault ? '240px' : 'none')};
  height: 50px;
  transition: background-image 1s ease;
  background-image: ${props => `url(https://www.bungie.net${props.emblem})`};
`;

const Emblem = styled.img`
  width: 34px;
  height: 34px;
  margin-right: 10px;
  filter: ${props => (props.vault ? 'invert(100%)' : 'none')};
`;

const Container = styled.div`
  text-align: left;
  margin-left: 10px;
  flex-grow: 1;
  margin-left: ${props => (props.vault ? '0' : '40px')};
`;

const raceHashMap = {
  3887404748: 'Human',
  2803282938: 'Awoken',
  898834093: 'Exo',
  full: '  .',
};

const classHashMap = {
  671679327: 'Hunter',
  2271682572: 'Warlock',
  3655393761: 'Titan',
  vault: 'Vault',
};

const defaultCharacter = {
  backgroundPath: undefined,
  emblemPath: undefined,
  characterLevel: undefined,
  classHash: undefined,
  raceHash: undefined,
  light: undefined,
  levelProgression: {
    level: undefined,
  },
};

export default ({ vault, character = defaultCharacter }) => {
  return (
    <CardContainer zDepth={2} grow>
      <StyledCard vault={vault} emblem={character.emblemBackgroundPath} justify="space-between">
        {vault && (
          <Emblem
            vault={vault}
            src={vault ? vaultIcon : `https://www.bungie.net${character.emblemPath}`}
          />
        )}

        <Container vault={vault}>
          <Text uppercase white={!vault}>
            {' '}
            {classHashMap[character.classHash]}{' '}
          </Text>
          <Text white={!vault} size={0} light>
            {' '}
            {raceHashMap[character.raceHash]}{' '}
          </Text>
        </Container>

        <Column
          justify="center"
          align="end"
          grow
          css={`
            margin-right: 10px;
          `}
        >
          <Text right uppercase lightLevel>
            {character.light}
          </Text>
          <Text right size={0} uppercase light white={!vault}>
            {character.levelProgression.level}
          </Text>
        </Column>
      </StyledCard>
    </CardContainer>
  );
};
