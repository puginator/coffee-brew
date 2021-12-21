import React from 'react';
import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';
// import {data} from './cardData.json';
import LogoSrc from './assets/images/Chemex.png';

// console.log(data)

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;  
    font-family: monospace, sans-serif;
    background-color: #404040;
    text-align: center;
  }
`; 

const Title = styled.h1`
  color: #ffffff;
  text-align: center;
`;
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Card = styled.div`
  background-color: #b3b3b3;
  display: flex;
  flex-direction: column;
  justify-content: space-space-evenly;
  align-items: center;
  width: 200px;
  height: 300px;
  border-radius: 5px;
  border: 3px solid #181818;
`;
const Subtitle = styled.h2`
  color: #ffffff;
  border-bottom: 3px solid #181818;
  width: 100%;
`;
const Logo = styled.img`
  width: 100px;
  height: 150px;
`;
const Button = styled.button`
  background-color: #181818;
  color: #ffffff;
  font-size: 15px;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  margin-top: 15px;
`;


function App() {
  return (
    <>
      <GlobalStyle />
      <Title>Coffee Brew Cards</Title>
      <Container>
        <Card>
          <Subtitle>Chemex</Subtitle>
          <Logo src={LogoSrc} />
          <Button>Brew</Button>
        </Card>
      </Container>

    </>
    
  );
}

export default App;