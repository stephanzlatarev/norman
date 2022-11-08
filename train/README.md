This is the prototype of the skill to improve other skills.

- choose units to act in random way (may be from none to all)
- for each step until victory or defeat:
    - translate fight observation to input tensor
    - for each non-random own unit:
        - run skill to output tensors 
        - translate output tensor to command
    - for each random own unit:
        - generate random command
- score fight outcome
- train model with the individual steps for each unit and the overall score for many epochs
- save model

```
INPUT:
[
  1, 1, 1, 1, 1, ..., 1,  Unit (-1=friendly at full health; 0=none; 1=enemy at full health) at coordinates from point of view of this unit
]
```

```
OUTPUT:
[
  1, 1,   // Move   Direction
  1, 1,   // Attack Direction
]
```

### TODO

1. Make a map for 3 probes vs 3 drones
2. Rotate pov when learning
3. Make a monitor for octosector pov

temp changes:
* play.js:14 - play limits wins to 1. was 10
* train.js:65 - learn limited to 3 passes. was 10
x starcraftGame.js:11-12 - explorers limited to 0. was 12
x play.js:137 - fight samples excluded. only formation samples included
x train.js:53-59 - don't learn new samples

* add class Skill. Replace map, perform, hypothesize, score, etc. with use of Skill instances. Replace this with Skill instance defined in YAML file.
* add class Data. Replace trainingSet, samples, etc. with Data instances.
* add skill to rotate and invert the sample when fitting the model

* https://www.tensorflow.org/js/guide
* https://js.tensorflow.org/api/latest/
* https://codelabs.developers.google.com/codelabs/tfjs-training-regression/index.html