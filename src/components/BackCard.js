import React from 'react';
import styled from 'styled-components';
import Timer from './Timer';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledBackCard = styled.div`
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

const StyledSubtitle = styled.h2``;

const StyledQuote = styled.p`
  color: #181818;
  text-align: center;
  background-color: #b3b3b3;
  border: 3px solid #181818;
  border-radius: 5px;
  font-size: 10px;
  padding: 10px 5px;
  margin: 0;
`;

const StyledBrewInstructions = styled.ol`
  color: #ffffff;
`;

const StyledBrewStep = styled.li`
  color: #ffffff; 
  font-size: 11px;
  line-height: 1.5;
`;

const StyledButton = styled.button`
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

const BackCardComponent = ({ recipe, handleClick }) => { 
  return (
    <Container>
        <StyledBackCard>
        <StyledSubtitle>{recipe.name}</StyledSubtitle>
        <StyledQuote>{recipe.quote}</StyledQuote>
        <StyledBrewInstructions>
            {Object.keys(recipe.instructions).map((step, index) => (
            <StyledBrewStep key={index}>{recipe.instructions[step]}</StyledBrewStep>
            ))}
        </StyledBrewInstructions>
        <StyledButton onClick={handleClick}>Back</StyledButton>
        <Timer />
        </StyledBackCard>
    </Container>
  );
}

export default BackCardComponent;