import React from 'react';
import { useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';
// import {data} from './cardData.json';
import LogoSrc from './assets/images/Chemex.png';
import Timer from './components/Timer';



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
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Card = styled.div`
  background-color: #b3b3b3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 300px;
  height: 400px;
  border-radius: 5px;
  border: 3px solid #181818;
  box-shadow: 0px 0px 15px 3px #b3b3b3;
  transition: transform 0.8s;
  transform-style: preserve-3d;


`;
const Subtitle = styled.h2`
  color: #ffffff;
  font-size: 2rem;
  text-align: center;
`;
const Logo = styled.img`
  width: 100px;
  height: 150px;
  margin-bottom: 5px;
`;

const RecipeHeader = styled.h5`
  color: #181818;
  text-align: center;
  margin: 0;
`;


const Recipe = styled.p`
  color: #ffffff;
  font-size: 12px;
  margin: 0 0 75px;
  padding: 5px 0;
  text-align: center;
  background-color: #181818;
`;


const Button = styled.button`
  background-color:${({primary}) => primary ? "#181818" : "#b3b3b3"}; 
  position: absolute;
  color: #ffffff;
  font-size: 15px;
  bottom: 10px;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  margin-top: 15px;
`;
const BackCard = styled.div`
  background-color: #181818;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 300px;
  height: 400px;
  border-radius: 5px;
  border: 3px solid #b3b3b3;
  box-shadow: 0px 0px 15px 5px #181818;

  transition: transform 0.8s;
  transform-style: preserve-3d;
`;
const BrewInstructions = styled.ol`
  color: #ffffff;
`;
const BrewStep = styled.li`
  color: #ffffff; 
  font-size: 11px;
  line-height: 1.5;
  `;
const Quote = styled.p`
  color: #181818;
  text-align: center;
  background-color: #b3b3b3;
  font-size: 10px;
  padding: 10px 5px;
  margin: 0;
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
{      flip ?  
        <Card>
          <Subtitle>Chemex</Subtitle>
          <Logo src={LogoSrc} />
          <RecipeHeader>Things Needed:</RecipeHeader>
          <Recipe>660g Water / 44g Coffee / Chemex / Chemex Filters / Gooseneck Kettle / Scale / Timer</Recipe>
          <Button primary onClick={handleClick}>Brew</Button>
        </Card>
        : <BackCard>
          <Subtitle>Chemex Recipe</Subtitle>
          <Quote>"The Chemex is as aesthetically pleasing as it is able to make delicious, well-rounded coffee for you and your friend(s)." -Augie</Quote>
          <BrewInstructions>
            <BrewStep>Heat Water to 205 F</BrewStep>
            <BrewStep>Place filter in Chemex, and rinse with hot water</BrewStep>
            <BrewStep>Coarse grind coffee and add to Chemex</BrewStep>
            <BrewStep>Add 75g of water and let bloom for 45seconds</BrewStep>
            <BrewStep>Continue adding water in Heavy 75g pours until you reached your total water amount</BrewStep>
            <BrewStep>Total brew time should be 3:30-4:30</BrewStep>
            <BrewStep>Wait for 30 seconds</BrewStep>
          </BrewInstructions>
          <Container>
            <Timer />
            <Button onClick={handleClick}>Back</Button>
          </Container>
          
        </BackCard> }
      </Container>

    </>
    
  );
}

export default App;