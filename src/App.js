import React from 'react';
import { useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';
import NewCard from './components/Card';
import BackCardComponent from './components/BackCard';
import { nanoid } from 'nanoid';

const data = require('./cardData.json');

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 20px;  
    font-family: monospace, sans-serif;
    background-color: #404040;
  }
`; 

const Title = styled.h1`
  color: #ffffff;
  text-align: center;
`;
const Container = styled.div`
  display: grid;
  grid: 1fr 1fr / 1fr 1fr 1fr;
  gap: 20px;
  justify-content: center;
  align-items: center;
  @media (max-width: 1200px) {
    grid: 1fr 1fr / 1fr 1fr;
  }
  @media (max-width: 768px) {
    grid: 1fr  / 1fr;
  }
`;


function App() {

  const [card,setCard] = useState(allNewCard());

  function allNewCard() {
    const newCard = data.map(card => {
      return {
        ...card,
        id: nanoid(),
        isFlipped: false
      }
    })
    return newCard;
  }

  function handleClick(id) {
    setCard(card.map(card => {
      if (card.id === id) {
        return {
          ...card,
          isFlipped: !card.isFlipped
        }
      }
      return card;
    }))
  }

  const cardElement = card.map(card => {
    return (
      !card.isFlipped ?     
        <NewCard
          key={card.id}
          recipe={card}
          handleClick={() => handleClick(card.id)}
          isFlipped={card.isFlipped}
        />
      :
        <BackCardComponent
          key={card.id}
          recipe={card}
          handleClick={() => handleClick(card.id)}
          isFlipped={card.isFlipped}
        />
    )

  })

  return (
    <>
      <GlobalStyle />
      <Title>Coffee Brew Cards</Title>
      <Container>
        {cardElement}
      </Container>
    </>
    
  );
}

export default App;