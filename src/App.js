import React from 'react';
import { useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';
import NewCard from './components/Card';
import BackCardComponent from './components/BackCard';


const data = require('./cardData.json');

console.log( typeof data);
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;  
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
`;


function App() {

  const [flip,setFlip] = useState(true);
  function handleClick() {
    setFlip(!flip);
  }
  return (
    <>
      <GlobalStyle />
      <Title>Coffee Brew Cards</Title>
      <Container>
        {data && data.map((recipe, index) => {
          return (
            flip ? <NewCard key={index} recipe={recipe} handleClick={handleClick} /> : <BackCardComponent key={index} recipe={recipe} handleClick={handleClick} />
          )
        })}
      </Container>
    </>
    
  );
}

export default App;